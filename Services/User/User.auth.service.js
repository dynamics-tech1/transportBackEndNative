"use strict";

const { sendSms } = require("../../Utils/smsSender");
const { sendEmail } = require("../../Utils/emailSender");
const { getOtpMessage, getEmailVerificationLinkMessage } = require("../../Utils/MessageTemplates");
const createJWT = require("../../Utils/CreateJWT");
const { currentDate } = require("../../Utils/CurrentDate");
const bcrypt = require("bcryptjs");
const verifyPassword = require("../../Utils/VerifyPassword");
const logger = require("../../Utils/logger");
const { usersRoles } = require("../../Utils/ListOfSeedData");
const AppError = require("../../Utils/AppError");
const { transactionStorage } = require("../../Utils/TransactionContext");
const { sendSocketIONotificationToAdmin } = require("../../Utils/Notifications");
const { getData, performJoinSelect } = require("../../CRUD/Read/ReadData");
const { updateData } = require("../../CRUD/Update/Data.update");
const { insertData } = require("../../CRUD/Create/CreateData");
const { v4: uuidv4 } = require("uuid");

const { driversDocumentVehicleRequirement } = require("../RoleDocumentRequirements.service");
const { createUserSubscription } = require("../UserSubscription.service");
const { getPricingWithFilters } = require("../SubscriptionPlanPricing.service");

let manageService;
let registryService;

const handleExistingUser = async ({
  requestedFrom,
  user,phoneNumber,
  fullName,
  email,
  roleId,
  statusId,
  userRoleStatusDescription = "no description",
}) => {
  if (!registryService) {
    registryService = require("./User.registry.service");
  }

  const userUniqueId = user.userUniqueId;
  if (!userUniqueId) {
    throw new AppError("wrong user data", 400);
  }

  // 1. Update fullName if it's a new or missing name
  if ((!user.fullName || user.fullName !== fullName) && fullName) {
    await updateData({
      tableName: "Users",
      updateValues: { fullName },
      conditions: { userUniqueId },
    });
    user.fullName = fullName;
  }

  // 2. Update email if it's currently missing
  const isMissing = !user.email;
  if (isMissing && email) {
    await updateData({
      tableName: "Users",
      updateValues: { email },
      conditions: { userUniqueId },
    });
    user.email = email;
  }

  // 3. Update phoneNumber if it's currently missing
  const isMissingPhone = !user.phoneNumber;
  if (isMissingPhone && phoneNumber) {
    await updateData({
      tableName: "Users",
      updateValues: { phoneNumber },
      conditions: { userUniqueId },
    });
    user.phoneNumber = phoneNumber;
  }

  // 3. Separate Identity Verification (OTP or Link Generation)
  const isPhoneVerified = !!user.isPhoneVerified;
  const isEmailVerified = !!user.isEmailVerified;

  let phoneOTP = null;
  let emailOTP = null;
  let emailVerificationToken = null;
  let emailVerificationExpiresAt = null;

  // GENERATE OTPs
  phoneOTP = Math.floor(100000 + Math.random() * 900000);
  
  if (isEmailVerified) {
    // ONE OTP FOR ALL (if both verified)
    emailOTP = phoneOTP; 
  } else if (user.email) {
    // LINK FOR EMAIL (if not verified)
    emailVerificationToken = uuidv4();
    emailVerificationExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  }

  const hashedPhoneOTP = await bcrypt.hash(String(phoneOTP), 10);
  const hashedEmailOTP = emailOTP ? await bcrypt.hash(String(emailOTP), 10) : null;

  const [credential] = await Promise.all([
    getData({ tableName: "usersCredential", conditions: { userUniqueId } }),
    registryService.handleUserRoleStatus(
      userUniqueId,
      roleId,
      statusId,
      userRoleStatusDescription,
    ),
  ]);

  const credentialValues = {
    phoneOTP: hashedPhoneOTP,
    emailOTP: hashedEmailOTP,
    OTP: hashedPhoneOTP, // Legacy
    emailVerificationToken,
    emailVerificationExpiresAt,
  };

  if (credential?.length === 0) {
    await insertData({
      tableName: "usersCredential",
      colAndVal: {
        credentialUniqueId: uuidv4(),
        userUniqueId,
        ...credentialValues,
        hashedPassword: hashedPhoneOTP,
        usersCredentialCreatedAt: currentDate(),
      },
    });
  } else {
    await updateData({
      tableName: "usersCredential",
      updateValues: credentialValues,
      conditions: { userUniqueId },
    });
  }

  if (requestedFrom === "street") {
    return { message: "success", data: user };
  }

  let otpDetail = "";
  let deferredOTP = null;

  if (transactionStorage.getStore()) {
    otpDetail = "Verification data generated (Sent deferred)";
    deferredOTP = { phoneOTP, emailOTP, emailVerificationToken };
  } else {
    try {
      // 1. Send SMS (Always OTP)
      const phoneMsg = getOtpMessage(phoneOTP, requestedFrom === "user" ? "login" : "registration");
      await sendSms(user.phoneNumber, phoneMsg.sms);
      
      // 2. Send Email (OTP or Link)
      if (user.email) {
        if (isEmailVerified) {
          // Send Unified OTP
          const emailMsg = getOtpMessage(emailOTP, requestedFrom === "user" ? "login" : "registration");
          await sendEmail(user.email, emailMsg.emailSubject, emailMsg.sms, emailMsg.emailHtml);
          otpDetail = "Unified OTP sent to phone and email";
        } else {
          // Send Verification Link
          const baseUrl = process.env.SANTIMPAY_WEBHOOK_URL?.split("/api")[0] || "http://localhost:3000";
          const link = `${baseUrl}/api/user/verify-email?token=${emailVerificationToken}`;
          const linkMsg = getEmailVerificationLinkMessage(link);
          await sendEmail(user.email, linkMsg.emailSubject, "Verify your email", linkMsg.emailHtml);
          otpDetail = "OTP sent to phone, Verification Link sent to email";
        }
      } else {
        otpDetail = "OTP sent to phone (No email provided)";
      }
    } catch (error) {
      logger.warn("Verification sending failed", { error: error.message });
      otpDetail = `Failed to send verification: ${error.message}`;
    }
  }

  // Driver gift logic
  try {
    if (Number(roleId) === usersRoles.driverRoleId) {
      const plansRes = await getPricingWithFilters();
      const freePlan = (plansRes?.data || []).find((p) => p?.isFree === true || p?.isFree === 1);
      if (freePlan?.subscriptionPlanPricingUniqueId) {
        await createUserSubscription({
          driverUniqueId: userUniqueId,
          subscriptionPlanPricingUniqueId: freePlan.subscriptionPlanPricingUniqueId,
          userSubscriptionCreatedBy: userUniqueId,
        });
      }
    }
  } catch (e) {
    logger.warn("Error creating free gift during sign-up for existing user", { error: e.message });
  }

  return {
    message: "success",
    data: user,
    messageDetail: otpDetail,
    deferredOTP,
  };
};

const loginUser = async (phoneNumber, roleId, email = null) => {
  if (!manageService) {
    manageService = require("./User.manage.service");
  }
  
  if (!roleId) {
    throw new AppError("Role ID is required.", 400);
  }

  // Check if at least one identity is provided
  if (!phoneNumber?.trim() && !email?.trim()) {
    throw new AppError("Phone number or email address is required.", 400);
  }

  const identity = (phoneNumber || email).trim();
  const userDataResult = await manageService.getUserByFilterDetailed({
    search: identity,
    includeDeleted: true,
  });

  if (!userDataResult?.data?.[0]?.user) {
    throw new AppError("User not found at this phone/email address. Please sign up first.", 404);
  }

  const userEntry = userDataResult.data[0];
  const userData = userEntry.user;
  if (userData?.isDeleted || userData?.userDeletedAt) {throw new AppError("Account has been deleted", 403);}

  const roleEntry = userEntry.rolesAndStatuses?.find((rs) => rs?.userRoles?.roleId === roleId);
  if (!roleEntry) {throw new AppError("User not found at this role. Please sign up for this role first.", 404);}

  return await handleExistingUser({
    requestedFrom: "user",
    user: userData,
    email: email || userData.email, // Use provided email to potentially upgrade placeholder
    roleId,
    statusId: roleEntry.userRoleStatuses?.statusId,
  });
};

const verifyUserByOTP = async (req) => {
  const { phoneNumber, email, OTP, roleId } = req.body;
  if (!OTP || (!phoneNumber && !email)) {
    throw new AppError("OTP and identity (phone/email) are required", 400);
  }

  const conditions = {};
  if (phoneNumber) conditions.phoneNumber = phoneNumber;
  if (email) conditions.email = email;

  const verifyUserExistence = await performJoinSelect({
    baseTable: "Users",
    joins: [{ table: "usersCredential", on: "Users.userUniqueId = usersCredential.userUniqueId" }],
    conditions,
    limit: 1,
  });

  if (!verifyUserExistence || verifyUserExistence.length === 0) {throw new AppError("user not found", 404);}
  
  const userRow = verifyUserExistence[0];
  if (userRow.isDeleted || userRow.userDeletedAt) {throw new AppError("Account has been deleted", 403);}

  // 1. Check which identity the OTP matches
  let phoneMatched = false;
  let emailMatched = false;

  if (userRow.phoneOTP) {
    try {
      await verifyPassword({ hashedPassword: userRow.phoneOTP, notHashedPassword: String(OTP) });
      phoneMatched = true;
    } catch (e) { /* ignore and check email */ }
  }

  if (!phoneMatched && userRow.emailOTP) {
    try {
      await verifyPassword({ hashedPassword: userRow.emailOTP, notHashedPassword: String(OTP) });
      emailMatched = true;
    } catch (e) { /* ignore */ }
  }

  // Fallback for legacy OTP column (if neither specific OTP matched)
  if (!phoneMatched && !emailMatched && userRow.OTP) {
    await verifyPassword({ hashedPassword: userRow.OTP, notHashedPassword: String(OTP) });
    // If legacy matches, we assume phone for now as it was the default
    phoneMatched = true; 
  }

  if (!phoneMatched && !emailMatched) {
    throw new AppError("Invalid OTP. Please check the code and try again.", 401);
  }

  // 2. Update verification status in the database
  const updateValues = {};
  if (phoneMatched) updateValues.isPhoneVerified = true;
  if (emailMatched) updateValues.isEmailVerified = true;

  if (Object.keys(updateValues).length > 0) {
    await updateData({
      tableName: "Users",
      updateValues,
      conditions: { userUniqueId: userRow.userUniqueId },
    });
  }

  const userInRoleId = await getData({
    tableName: "UserRole",
    conditions: { roleId, userUniqueId: userRow.userUniqueId },
  });

  if (userInRoleId.length === 0) {throw new AppError("user not found in this role", 401);}

  const tokenData = createJWT({
    userUniqueId: userRow.userUniqueId,
    fullName: userRow.fullName,
    phoneNumber: userRow.phoneNumber,
    email: userRow.email,
    roleId,
    isPhoneVerified: phoneMatched || !!userRow.isPhoneVerified,
    isEmailVerified: emailMatched || !!userRow.isEmailVerified,
  });

  const resData = {
    message: "success",
    token: tokenData.token,
    data: "OTP verified successfully",
    verificationStatus: {
      phoneVerified: phoneMatched || !!userRow.isPhoneVerified,
      emailVerified: emailMatched || !!userRow.isEmailVerified,
    }
  };

  if (Number(roleId) === usersRoles.driverRoleId) {
    const docReq = await driversDocumentVehicleRequirement({
      ownerUserUniqueId: userRow.userUniqueId,
      user: userRow,
    });

    if (docReq?.message === "error") {throw new AppError(docReq.error || "Failed to check requirements", 500);}

    const { unAttachedDocumentTypes, attachedDocumentsByStatus } = docReq;
    if (attachedDocumentsByStatus?.PENDING?.length > 0 || attachedDocumentsByStatus?.REJECTED?.length > 0 || unAttachedDocumentTypes?.length > 0) {
      sendSocketIONotificationToAdmin({ message: { ...docReq } });
    }
    resData.documentAndVehicleOfDriver = docReq;
  }

  return resData;
};

const verifyEmailByToken = async (token) => {
  if (!token) throw new AppError("Invalid or missing token", 400);

  const [credential] = await getData({
    tableName: "usersCredential",
    conditions: { emailVerificationToken: token },
  });

  if (!credential) throw new AppError("Verification link is invalid or has expired.", 400);

  const now = new Date();
  const expiry = new Date(credential.emailVerificationExpiresAt);
  if (now > expiry) throw new AppError("Verification link has expired. Please log in again to receive a new one.", 400);

  // Mark as verified
  await Promise.all([
    updateData({
      tableName: "Users",
      updateValues: { isEmailVerified: true },
      conditions: { userUniqueId: credential.userUniqueId },
    }),
    updateData({
      tableName: "usersCredential",
      updateValues: { emailVerificationToken: null, emailVerificationExpiresAt: null },
      conditions: { userUniqueId: credential.userUniqueId },
    }),
  ]);

  return { message: "Email verified successfully! You can now use all features of the app." };
};

module.exports = {
  loginUser,
  verifyUserByOTP,
  handleExistingUser,
  verifyEmailByToken,
};

