"use strict";

const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../Middleware/Database.config");
const { getData } = require("../../CRUD/Read/ReadData");
const { updateData } = require("../../CRUD/Update/Data.update");
const { insertData } = require("../../CRUD/Create/CreateData");
const { currentDate } = require("../../Utils/CurrentDate");
const bcrypt = require("bcryptjs");
const { usersRoles, USER_STATUS } = require("../../Utils/ListOfSeedData");
const AppError = require("../../Utils/AppError");
const { transactionStorage } = require("../../Utils/TransactionContext");
const generateOTP = require("../../Utils/GenerateOTP");
const { createUserSubscription } = require("../UserSubscription.service");
const { getPricingWithFilters } = require("../SubscriptionPlanPricing.service");

// Circular dependency handling
let authService;

const ensureCredentialForUser = async ({ userUniqueId, rawPassword }) => {
  if (!userUniqueId) {
    throw new AppError("userUniqueId required", 400);
  }
  const OTP = rawPassword || generateOTP();
  const hashedOTP = await bcrypt.hash(String(OTP), 10);
  const conditions = { userUniqueId };
  const existing = await getData({
    tableName: "usersCredential",
    conditions,
  });
  const hashedPhoneVerificationOTP = await bcrypt.hash(
    String(generateOTP()),
    10,
  );
  const hashedEmailVerificationOTP = await bcrypt.hash(
    String(generateOTP()),
    10,
  );
  const emailVerificationToken = uuidv4();
  const emailVerificationExpiresAt = currentDate();

  if (existing && existing.length > 0) {
    const credentialColAndValues = {
      sharedOTP: hashedOTP,
      hashedPassword: hashedOTP,
    };
    const user = existing?.[0];
    const isPhoneVerified = user?.isPhoneVerified;
    const isEmailVerified = user?.isEmailVerified;
    //if phone is verified update phoneVerificationOTP to hashedOTP
    if (isPhoneVerified) {
      credentialColAndValues.phoneVerificationOTP = hashedOTP;
    } else {
      credentialColAndValues.phoneVerificationOTP = hashedPhoneVerificationOTP;
    }
    //if email is verified update emailVerificationOTP to hashedOTP
    if (isEmailVerified) {
      credentialColAndValues.emailVerificationOTP = hashedOTP;
    } else {
      credentialColAndValues.emailVerificationToken = emailVerificationToken;
      credentialColAndValues.emailVerificationExpiresAt =
        emailVerificationExpiresAt;
      credentialColAndValues.emailVerificationOTP = hashedEmailVerificationOTP;
    }

    const upd = await updateData({
      tableName: "usersCredential",
      updateValues: { ...credentialColAndValues },
      conditions: { userUniqueId },
    });
    if (upd?.affectedRows === 0) {
      throw new AppError("Unable to update credential", 500);
    }
    return { message: "success" };
  }

  const credentialColAndVal = {
    userUniqueId,
    credentialUniqueId: uuidv4(),
    phoneVerificationOTP: hashedPhoneVerificationOTP,
    emailVerificationOTP: hashedEmailVerificationOTP,
    sharedOTP: hashedOTP, // Legacy
    emailVerificationToken,
    emailVerificationExpiresAt,
    hashedPassword: hashedOTP,
    usersCredentialCreatedBy: userUniqueId,
    usersCredentialCreatedAt: currentDate(),
  };
  const ins = await insertData({
    tableName: "usersCredential",
    colAndVal: {
      ...credentialColAndVal,
    },
  });

  if (ins?.affectedRows === 0) {
    throw new AppError("Unable to create credential", 500);
  }
  return { message: "success" };
};

const handleUserRoleStatus = async (
  userUniqueId,
  roleId,
  statusId,
  description = "",
) => {
  const executor = transactionStorage.getStore() || pool;

  const [existingRoles] = await executor.query(
    "SELECT userRoleId FROM UserRole WHERE userUniqueId = ? AND roleId = ?",
    [userUniqueId, roleId],
  );

  let userRoleId;
  if (existingRoles.length === 0) {
    const userRoleUniqueId = uuidv4();
    const [roleIns] = await executor.query(
      "INSERT INTO UserRole (userRoleUniqueId, userUniqueId, roleId, userRoleCreatedAt, userRoleCreatedBy) VALUES (?, ?, ?, ?, ?)",
      [userRoleUniqueId, userUniqueId, roleId, currentDate(), userUniqueId],
    );
    userRoleId = roleIns.insertId;
  } else {
    userRoleId = existingRoles[0].userRoleId;
  }

  const [existingStatus] = await executor.query(
    "SELECT userRoleStatusId FROM UserRoleStatusCurrent WHERE userRoleId = ?",
    [userRoleId],
  );

  if (existingStatus.length === 0) {
    await executor.query(
      "INSERT INTO UserRoleStatusCurrent (userRoleStatusUniqueId, userRoleId, statusId, userRoleStatusDescription, userRoleStatusCreatedAt, userRoleStatusCreatedBy) VALUES (?, ?, ?, ?, ?, ?)",
      [
        uuidv4(),
        userRoleId,
        statusId,
        description,
        currentDate(),
        userUniqueId,
      ],
    );
  } else {
    await executor.query(
      "UPDATE UserRoleStatusCurrent SET statusId = ?, userRoleStatusDescription = ?, userRoleStatusCreatedAt = ? WHERE userRoleId = ?",
      [statusId, description, currentDate(), userRoleId],
    );
  }
};

const registerNewUser = async ({
  fullName,
  phoneNumber,
  email,
  roleId,
  statusId,
  userRoleStatusDescription,
  requestedFrom,
  createdBy,
}) => {
  const userUniqueId = uuidv4();
  const userCreatedAt = currentDate();
  const userCreatedByParam = createdBy || userUniqueId;

  const executor = transactionStorage.getStore() || pool;
  const [userIns] = await executor.query(
    "INSERT INTO Users (userUniqueId, fullName, phoneNumber, email, userCreatedAt, userCreatedBy,isEmailVerified,isPhoneVerified) VALUES (?, ?, ?, ?, ?, ?,?,?)",
    [
      userUniqueId,
      fullName,
      phoneNumber,
      email,
      userCreatedAt,
      userCreatedByParam,
      false,
      false,
    ],
  );

  if (userIns.affectedRows === 0) {
    throw new AppError("User registration failed", 500);
  }

  const [insertedUserRows] = await executor.query(
    "SELECT * FROM Users WHERE userUniqueId = ?",
    [userUniqueId]
  );
  const userData = insertedUserRows[0];

  await ensureCredentialForUser({ userUniqueId });
  await handleUserRoleStatus(
    userUniqueId,
    roleId,
    statusId,
    userRoleStatusDescription,
  );

  if (roleId === usersRoles.driverRoleId) {
    const pricing = await getPricingWithFilters({ isFree: true });
    if (pricing?.data?.[0]) {
      await createUserSubscription({
        driverUniqueId: userUniqueId,
        subscriptionPlanPricingUniqueId:
          pricing.data[0].subscriptionPlanPricingUniqueId,
        userSubscriptionCreatedBy: userUniqueId,
      });
    }
  }

  if (!authService) {
    authService = require("./User.auth.service");
  }
  return await authService.handleExistingUser({
    requestedFrom,
    user: userData,
    roleId,
    statusId,
  });
};

const createUser = async (body) => {
  const { fullName, phoneNumber, roleId, statusId, userRoleStatusDescription } =
    body;
  let email = body?.email?.trim();
  //if there is no email, generate placeholder email
  if (!email) {
    email = `${phoneNumber}@dynamics.com`;
  }

  // 1. Enforce   phoneNumber
  if (!phoneNumber?.trim()) {
    throw new AppError("Phone number is mandatory for registration.", 400);
  }

  const cleanPhone = phoneNumber?.trim();
  const cleanEmail = email?.trim();
  //build conditions
  const conditions = {
    phoneNumber: cleanPhone,
  };
  // if email is NOT a placeholder, add it to OR conditions for account lookup
  if (cleanEmail && !cleanEmail.endsWith("@dynamics.com")) {
    conditions.email = cleanEmail;
  }
  // 2. Check if EITHER identity is already taken to prevent separate accounts
  const { performJoinSelect } = require("../../CRUD/Read/ReadData");
  const existing = await performJoinSelect({
    baseTable: "Users",
    conditions,
    operator: "OR",
    limit: 1,
  });
  // return existing
  console.log("DEBUG createUser lookup:", { conditions, cleanPhone, cleanEmail, foundUser: existing?.[0] });

  if (existing?.length > 0) {
    const user = existing[0];

    // 3. Security Check: Prevent "Identity Hijacking"
    // If we found a matching phone but different email (or vice versa), block it.
    const isSavedEmailPlaceholder = user?.email?.endsWith("@dynamics.com");
    const isInputEmailPlaceholder = cleanEmail?.endsWith("@dynamics.com");
    if (user?.email && !isSavedEmailPlaceholder && !isInputEmailPlaceholder && user?.email !== cleanEmail) {
      throw new AppError(
        "This phone number is already registered with a different email address.",
        403,
      );
    }
    //phone dont have placeholder
    if (user?.phoneNumber && user?.phoneNumber !== cleanPhone) {
      throw new AppError(
        "This email address is already registered with a different phone number.",
        403,
      );
    }
    //check if user is deleted
    if (user?.isDeleted || user?.userDeletedAt) {
      throw new AppError("Account has been deleted", 403);
    }
    // User already has an account, handle OTP login
    if (!authService) {
      authService = require("./User.auth.service");
    }
    const userData = {
      requestedFrom: "user",
      user,
      phoneNumber: cleanPhone,
      fullName: fullName,
      email: cleanEmail,
      roleId,
      statusId,
      userRoleStatusDescription,
    };
    // return userData;

    return await authService.handleExistingUser(userData);
  }

  return await registerNewUser({
    fullName,
    phoneNumber,
    email,
    roleId,
    statusId,
    userRoleStatusDescription,
    requestedFrom: "user",
  });
};

const createUserByAdminOrSuperAdmin = async ({
  body,
  userUniqueId,
  userRoleStatusDescription,
}) => {
  const { fullName, phoneNumber, email, roleId, statusId } = body;

  const userDataByEmail = await getData({
    tableName: "Users",
    conditions: { email },
  });

  if (userDataByEmail?.[0]) {
    await ensureCredentialForUser({
      userUniqueId: userDataByEmail[0].userUniqueId,
    });
    await handleUserRoleStatus(
      userDataByEmail[0].userUniqueId,
      roleId,
      statusId,
      "",
    );
    if (phoneNumber && userDataByEmail[0].phoneNumber !== phoneNumber) {
      throw new AppError("There is a difference in phone number", 409);
    }
    return {
      message: "success",
      data: "User already exists with this email address",
    };
  }

  const userDataByPhoneNumber = await getData({
    tableName: "Users",
    conditions: { phoneNumber },
  });

  if (userDataByPhoneNumber?.[0]) {
    const existingUser = userDataByPhoneNumber[0];
    const existingUserUniqueId = existingUser.userUniqueId;

    // Update fullName if user.fullName is not provided before, but now fullName is provided and different
    if (
      !existingUser.fullName &&
      fullName &&
      existingUser.fullName !== fullName
    ) {
      await updateData({
        tableName: "Users",
        updateValues: { fullName },
        conditions: { userUniqueId: existingUserUniqueId },
      });
    }

    // Ensure the user is registered for the new role and status
    await handleUserRoleStatus(
      existingUserUniqueId,
      roleId,
      statusId,
      userRoleStatusDescription,
    );

    // Generate/Update OTP for verification
    await ensureCredentialForUser({ userUniqueId: existingUserUniqueId });

    if (email && existingUser.email && existingUser.email !== email) {
      throw new AppError("There is a difference in email address", 409);
    }

    return {
      message: "success",
      data: "User already exists with this phone number. Role and OTP have been updated.",
    };
  }

  return await registerNewUser({
    fullName,
    phoneNumber,
    email,
    roleId,
    statusId,
    userRoleStatusDescription,
    requestedFrom: "Supper Admin/Admin",
    createdBy: userUniqueId,
  });
};
//some jobs can be done by system itself by written codes not by admin or supper admin or users
const createUserSystem = async () => {
  const fullName = "system";
  const phoneNumber = "+251922112480";
  const email = "system@system.com";
  const roleId = usersRoles.systemRoleId;
  const statusId = USER_STATUS.ACTIVE;

  await createUserByAdminOrSuperAdmin({
    body: {
      fullName,
      phoneNumber,
      email,
      roleId,
      statusId,
      userRoleStatusDescription:
        "this can manage things by itself based on written programs",
    },
    userUniqueId: "system",
  });

  await createUserByAdminOrSuperAdmin({
    body: {
      fullName: "Supper Admin",
      phoneNumber: "+251983222221",
      email: "supperAdmin@supperAdmin.com",
      roleId: usersRoles.supperAdminRoleId,
      statusId: USER_STATUS.ACTIVE,
      userRoleStatusDescription:
        "Supper Admin can manage drivers passengers and admin using api requests",
    },
    userUniqueId: "Supper Admin",
  });
};

module.exports = {
  createUser,
  createUserSystem,
  createUserByAdminOrSuperAdmin,
  registerNewUser,
  ensureCredentialForUser,
  handleUserRoleStatus,
};
