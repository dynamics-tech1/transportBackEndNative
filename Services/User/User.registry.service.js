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

const { createUserSubscription } = require("../UserSubscription.service");
const { getPricingWithFilters } = require("../SubscriptionPlanPricing.service");

// Circular dependency handling
let authService;

const ensureCredentialForUser = async ({ userUniqueId, rawPassword }) => {
  if (!userUniqueId) {
    throw new AppError("userUniqueId required", 400);
  }
  const OTP = rawPassword || Math.floor(100000 + Math.random() * 900000);
  const hashed = await bcrypt.hash(String(OTP), 10);
  
  const existing = await getData({
    tableName: "usersCredential",
    conditions: { userUniqueId },
  });
  
  if (existing && existing.length > 0) {
    const upd = await updateData({
      tableName: "usersCredential",
      updateValues: { OTP: hashed, hashedPassword: hashed },
      conditions: { userUniqueId },
    });
    if (upd?.affectedRows === 0) {
      throw new AppError("Unable to update credential", 500);
    }
    return { message: "success" };
  }
  
  const ins = await insertData({
    tableName: "usersCredential",
    colAndVal: {
      credentialUniqueId: uuidv4(),
      userUniqueId,
      OTP: hashed,
      hashedPassword: hashed,
      usersCredentialCreatedBy: userUniqueId,
      usersCredentialCreatedAt: currentDate(),
    },
  });
  
  if (ins?.affectedRows === 0) {
    throw new AppError("Unable to create credential", 500);
  }
  return { message: "success" };
};

const handleUserRoleStatus = async (userUniqueId, roleId, statusId, description = "") => {
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
      [uuidv4(), userRoleId, statusId, description, currentDate(), userUniqueId],
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
  const userData = {
    userUniqueId,
    fullName,
    phoneNumber,
    email,
    userCreatedAt: currentDate(),
    userCreatedBy: createdBy || userUniqueId,
  };

  const executor = transactionStorage.getStore() || pool;
  const [userIns] = await executor.query(
    "INSERT INTO Users (userUniqueId, fullName, phoneNumber, email, userCreatedAt, userCreatedBy) VALUES (?, ?, ?, ?, ?, ?)",
    [userUniqueId, fullName, phoneNumber, email, userData.userCreatedAt, userData.userCreatedBy]
  );

  if (userIns.affectedRows === 0) {
    throw new AppError("User registration failed", 500);
  }

  await ensureCredentialForUser({ userUniqueId });
  await handleUserRoleStatus(userUniqueId, roleId, statusId, userRoleStatusDescription);

  if (roleId === usersRoles.driverRoleId) {
    const pricing = await getPricingWithFilters({ isFree: true });
    if (pricing?.data?.[0]) {
      await createUserSubscription({
        driverUniqueId: userUniqueId,
        subscriptionPlanPricingUniqueId: pricing.data[0].subscriptionPlanPricingUniqueId,
        userSubscriptionCreatedBy: userUniqueId,
      });
    }
  }

  if (!authService) {authService = require("./User.auth.service");}
  return await authService.handleExistingUser({
    requestedFrom,
    user: userData,
    roleId,
    statusId,
  });
};

const createUser = async (body) => {
  const { fullName, phoneNumber, email, roleId, statusId, userRoleStatusDescription } = body;

  const existing = await getData({
    tableName: "Users",
    conditions: { phoneNumber },
  });
 
  if (existing?.length > 0) {
    const user = existing?.[0];
    if (user?.isDeleted) {
      throw new AppError("Account has been deleted", 403);
    }
    
    if (!authService) {authService = require("./User.auth.service");}
    return await authService.handleExistingUser({
      requestedFrom: "user",
      user,
      fullName,
      roleId,
      statusId,
      userRoleStatusDescription,
    });
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

const createUserByAdminOrSuperAdmin = async ({ body, userUniqueId,userRoleStatusDescription }) => {
  const { fullName, phoneNumber, email, roleId, statusId } = body;
  
  const userDataByEmail = await getData({
    tableName: "Users",
    conditions: { email },
  });

  if (userDataByEmail?.[0]) {
    await ensureCredentialForUser({ userUniqueId: userDataByEmail[0].userUniqueId });
    await handleUserRoleStatus(userDataByEmail[0].userUniqueId, roleId, statusId, "");
    if (phoneNumber && userDataByEmail[0].phoneNumber !== phoneNumber) {
      throw new AppError("There is a difference in phone number", 409);
    }
    return { message: "success", data: "User already exists with this email address" };
  }

  const userDataByPhoneNumber = await getData({
    tableName: "Users",
    conditions: { phoneNumber },
  });

  if (userDataByPhoneNumber?.[0]) {
    const existingUser = userDataByPhoneNumber[0];
    const existingUserUniqueId = existingUser.userUniqueId;

    // Update fullName if user.fullName is not provided before, but now fullName is provided and different
    if (!existingUser.fullName && fullName && existingUser.fullName !== fullName) {
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
      userRoleStatusDescription: "this can manage things by itself based on written programs",
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
      userRoleStatusDescription: "Supper Admin can manage drivers passengers and admin using api requests",
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
