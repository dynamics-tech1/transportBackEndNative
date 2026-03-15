"use strict";

const { sendSms } = require("../../Utils/smsSender");
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

const handleExistingUser = async ({ requestedFrom, user, roleId, statusId, userRoleStatusDescription = "no description" }) => {
  if (!registryService) {registryService = require("./User.registry.service");}
  
  const userUniqueId = user.userUniqueId;
  if (!userUniqueId) {throw new AppError("wrong user data", 400);}

  const OTP = Math.floor(100000 + Math.random() * 900000);
  const hashedOTP = await bcrypt.hash(String(OTP), 10);

  const [credential] = await Promise.all([
    getData({ tableName: "usersCredential", conditions: { userUniqueId } }),
    registryService.handleUserRoleStatus(userUniqueId, roleId, statusId, userRoleStatusDescription),
  ]);

  if (credential?.length === 0) {
    await insertData({
      tableName: "usersCredential",
      colAndVal: {
        credentialUniqueId: uuidv4(),
        userUniqueId,
        OTP: hashedOTP,
        hashedPassword: hashedOTP,
        usersCredentialCreatedAt: currentDate(),
      },
    });
  }

  if (requestedFrom === "street") {
    return { message: "success", data: user };
  }

  // Update OTP
  const updateOtpResult = await updateData({
    tableName: "usersCredential",
    updateValues: { OTP: hashedOTP },
    conditions: { userUniqueId },
  });

  let otpDetail = "";
  if (updateOtpResult.affectedRows > 0) {
    if (transactionStorage.getStore()) {
      otpDetail = "OTP updated (SMS deferred until after transaction)";
    } else {
      try {
        const smsMsg = `Your OTP for ${requestedFrom} login is ${OTP}. Do not share it.`;
        const smsResult = await sendSms(user.phoneNumber, smsMsg);
        otpDetail = (smsResult.status === "success" || smsResult.message === "success") 
          ? "OTP updated and sent successfully" 
          : "OTP updated but SMS sending failed";
      } catch (smsError) {
        logger.warn("SMS sending failed during OTP update", { phoneNumber: user.phoneNumber, error: smsError.message });
        otpDetail = `OTP updated but SMS sending failed: ${smsError.message}`;
      }
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
  };
};

const loginUser = async (phoneNumber, roleId) => {
  if (!manageService) {manageService = require("./User.manage.service");}
  if (!phoneNumber?.trim() || !roleId) {throw new AppError("Phone number and role ID are required.", 400);}

  const cleanPhoneNumber = phoneNumber.trim();
  const userDataResult = await manageService.getUserByFilterDetailed({
    search: cleanPhoneNumber,
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
    roleId,
    statusId: roleEntry.userRoleStatuses?.statusId,
  });
};

const verifyUserByOTP = async (req) => {
  const { phoneNumber, OTP, roleId } = req.body;
  if (!OTP || !phoneNumber) {throw new AppError("OTP and phoneNumber are required", 400);}

  const verifyUserExistence = await performJoinSelect({
    baseTable: "Users",
    joins: [{ table: "usersCredential", on: "Users.userUniqueId = usersCredential.userUniqueId" }],
    conditions: { phoneNumber },
  });

  if (!verifyUserExistence || verifyUserExistence.length === 0) {throw new AppError("user not found", 404);}
  
  const userRow = verifyUserExistence[0];
  if (userRow.isDeleted || userRow.userDeletedAt) {throw new AppError("Account has been deleted", 403);}

  await verifyPassword({ hashedPassword: userRow.OTP, notHashedPassword: String(OTP) });

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
  });

  const resData = {
    message: "success",
    token: tokenData.token,
    data: "OTP verified successfully",
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

module.exports = {
  loginUser,
  verifyUserByOTP,
  handleExistingUser,
};

