// services/userService.js
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../Middleware/Database.config");
const { getData, performJoinSelect } = require("../CRUD/Read/ReadData");
const { updateData } = require("../CRUD/Update/Data.update");
const { sendSms } = require("../Utils/smsSender");
const createJWT = require("../Utils/CreateJWT");
const { currentDate } = require("../Utils/CurrentDate");
const { insertData } = require("../CRUD/Create/CreateData");
const { sendSocketIONotificationToAdmin } = require("../Utils/Notifications");
const bcrypt = require("bcryptjs");
const verifyPassword = require("../Utils/VerifyPassword");
const logger = require("../Utils/logger");
const {
  driversDocumentVehicleRequirement,
} = require("./RoleDocumentRequirements.service");
const { usersRoles } = require("../Utils/ListOfSeedData");
// Removed unused import: createFreeGiftToDriver
const { executeInTransaction } = require("../Utils/DatabaseTransaction");
const AppError = require("../Utils/AppError");

const { createUserSubscription } = require("./UserSubscription.service");
const { getPricingWithFilters } = require("./SubscriptionPlanPricing.service");

const createUserSystem = async () => {
  const fullName = "system";
  const phoneNumber = "+251922112480";
  const email = "system@system.com";
  const roleId = usersRoles.systemRoleId;
  const statusId = 1;
  const userRoleStatusDescription =
    "this can manage things by itself based on written programs";

  await createUserByAdminOrSuperAdmin({
    body: {
      fullName,
      phoneNumber,
      email,
      roleId,
      statusId,
      userRoleStatusDescription,
      requestedFrom: "system",
    },
    userUniqueId: "system",
  });

  await createUserByAdminOrSuperAdmin({
    body: {
      fullName: "Supper Admin",
      phoneNumber: "+251983222221",
      email: "supperAdmin@supperAdmin.com",
      roleId: usersRoles.supperAdminRoleId,
      statusId: 1,
      userRoleStatusDescription:
        "Supper Admin can manage drivers passengers and admin using api requests",
      requestedFrom: "Supper Admin",
    },
    userUniqueId: "Supper Admin",
  });

  return;
};

// Ensure a credential exists for a user; update if exists, insert if not
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
    throw new AppError("Unable to insert credential", 500);
  }
  return { message: "success" };
};

const handleExistingUser = async ({
  requestedFrom,
  user,
  roleId,
  statusId,
  userRoleStatusDescription = "no description",
  connection = null, // Optional: connection for transaction support
}) => {
  const userUniqueId = user.userUniqueId;
  if (!userUniqueId) {
    throw new AppError("wrong user data", 400);
  }

  // Generate OTP
  const OTP = Math.floor(100000 + Math.random() * 900000);

  const [credential] = await Promise.all([
    getData({
      tableName: "usersCredential",
      conditions: { userUniqueId },
      connection, // Pass connection for transaction support
    }),
    // Handle existing user: Insert/Update roles and statuses
    handleUserRoleStatus(
      user.userUniqueId,
      roleId,
      statusId,
      userRoleStatusDescription,
      connection, // Pass connection for transaction support
    ),
  ]);

  // create new credential if it does not exist
  if (credential?.length === 0) {
    //create new credential by hashing OTP
    const hashedOtps = await bcrypt.hash(String(OTP), 10);
    await insertData({
      tableName: "usersCredential",
      colAndVal: {
        credentialUniqueId: uuidv4(),
        userUniqueId,
        OTP: hashedOtps,
        hashedPassword: hashedOtps,
        usersCredentialCreatedAt: currentDate(),
      },
      connection, // Pass connection for transaction support
    });
  }

  const hashedOTP = await bcrypt.hash(String(OTP), 10);

  if (requestedFrom === "street") {
    return {
      message: "success",
      data: user,
    };
  }
  // Update OTP for existing user

  const otpUpdated = await updateOtpForUser({
    userUniqueId: user.userUniqueId,
    hashedOTP: hashedOTP,
    phoneNumber: user.phoneNumber,
    OTP,
    connection, // Pass connection for transaction support
  });

  try {
    if (Number(roleId) === usersRoles.driverRoleId) {
      const plansRes = await getPricingWithFilters();
      const plans = plansRes?.data || [];
      // find a free plan
      const freePlan = plans.find((p) => p?.isFree === true || p?.isFree === 1);
      if (freePlan?.subscriptionPlanPricingUniqueId) {
        await createUserSubscription({
          driverUniqueId: userUniqueId,
          subscriptionPlanPricingUniqueId:
            freePlan.subscriptionPlanPricingUniqueId,
          userSubscriptionCreatedBy: userUniqueId,
        });
      }
    }
    // prepare return message
    return {
      message: "success",
      data: user,
      ...otpUpdated,
    };
  } catch (e) {
    logger.warn("Error creating free gift during sign-up", {
      error: e.message,
      stack: e.stack,
    });
    // ignore gift errors during sign-up to not block user creation
    return {
      message: "success",
      data: user,
      ...otpUpdated,
    };
  }
};

// utils/registerNewUser.js
const registerNewUser = async ({
  fullName,
  phoneNumber,
  email,
  roleId,
  statusId,
  userRoleStatusDescription,
  requestedFrom,
  createdBy = "system",
  connection = null, // Optional: connection for transaction support
}) => {
  const userUniqueId = uuidv4();
  const credentialUniqueId = uuidv4();
  const OTP = Math.floor(100000 + Math.random() * 900000);
  const hashedOtps = await bcrypt.hash(String(OTP), 10);

  const dataOfPassenger = {
    userUniqueId,
    fullName,
    phoneNumber,
    email,
    userCreatedAt: currentDate(),
    userCreatedBy: createdBy,
  };

  // Insert user and credential - use provided connection or create new transaction
  const insertUserAndCredential = async (conn) => {
    // Insert user
    const userColumns = Object.keys(dataOfPassenger);
    const userValues = Object.values(dataOfPassenger);
    const userPlaceholders = userColumns.map(() => "?").join(", ");
    const userSql = `INSERT INTO Users (${userColumns.join(
      ", ",
    )}) VALUES (${userPlaceholders})`;
    const [userResult] = await conn.query(userSql, userValues);

    // Insert credential
    // Use userUniqueId for self-referential creation if createdBy is not a valid UUID
    const isValidUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdBy,
      );
    const credentialData = {
      credentialUniqueId,
      userUniqueId,
      OTP: hashedOtps,
      hashedPassword: hashedOtps,
      usersCredentialCreatedBy: isValidUUID ? createdBy : userUniqueId,
      usersCredentialCreatedAt: currentDate(),
    };
    const credentialColumns = Object.keys(credentialData);
    const credentialValues = Object.values(credentialData);
    const credentialPlaceholders = credentialColumns.map(() => "?").join(", ");
    const credentialSql = `INSERT INTO usersCredential (${credentialColumns.join(
      ", ",
    )}) VALUES (${credentialPlaceholders})`;
    const [credentialResult] = await conn.query(
      credentialSql,
      credentialValues,
    );

    return [userResult, credentialResult];
  };

  // Use transaction to ensure both user and credential are created atomically
  const [insertedUser, insertedCredential] = connection
    ? await insertUserAndCredential(connection)
    : await executeInTransaction(insertUserAndCredential);

  const userCreationSuccess = [insertedCredential, insertedUser];
  const allInserted = userCreationSuccess.every((res) => res?.affectedRows > 0);

  if (!allInserted) {
    throw new AppError("An error occurred during user creation", 500);
  }

  await handleUserRoleStatus(
    userUniqueId,
    roleId,
    statusId,
    userRoleStatusDescription,
    connection, // ensure same transaction/connection is used
  );

  if (requestedFrom === "user") {
    // send otp to users via AfroMessage SMS (defer if inside transaction)
    if (!connection) {
      try {
        const smsResult = await sendSms(phoneNumber, OTP);
        if (smsResult.status === "success" || smsResult.message === "success") {
          return {
            status: "success",
            data: dataOfPassenger,
            messageDetail: "User created successfully, OTP sent successfully",
          };
        }
      } catch (smsError) {
        logger.warn("SMS sending failed during user registration", {
          phoneNumber,
          error: smsError.message,
        });
        return {
          status: "success",
          data: dataOfPassenger,
          messageDetail: `User created successfully, but OTP SMS could not be sent: ${smsError.message}`,
        };
      }
    } else {
      return {
        message: "success",
        data: dataOfPassenger,
        messageDetail:
          "User created successfully (OTP send deferred until after transaction)",
      };
    }
  }
  // if user is driver give available free gift subscription if it was not given before.
  try {
    if (Number(roleId) === usersRoles.driverRoleId) {
      const plansRes = await getPricingWithFilters();
      const plans = plansRes?.data || [];
      // find a free plan
      const freePlan = plans.find((p) => p?.isFree === true || p?.isFree === 1);
      if (freePlan?.subscriptionPlanUniqueId) {
        await createUserSubscription({
          driverUniqueId: userUniqueId,
          subscriptionPlanUniqueId: freePlan.subscriptionPlanUniqueId,
          userSubscriptionCreatedBy: userUniqueId,
        });
      }
    }
    // prepare return message
    return {
      message: "success",
      data: dataOfPassenger,
    };
  } catch (e) {
    logger.warn("Error creating free gift during sign-up", {
      error: e.message,
      stack: e.stack,
    });
    // ignore gift errors during sign-up to not block user creation
    return {
      message: "success",
      data: dataOfPassenger,
    };
  }
};

const createUser = async (body, connection = null) => {
  const requestedFrom = body?.requestedFrom || "user";
  const fullName = body?.fullName;
  const phoneNumber = body?.phoneNumber;
  const email = body?.email;
  const roleId = body?.roleId;
  const statusId = body?.statusId || 1; // Default to 1 (active status) if not provided
  const userRoleStatusDescription = body?.userRoleStatusDescription;

  if (roleId >= 3) {
    throw new AppError(`you can't create this user`, 403);
  }

  if (!phoneNumber || !roleId) {
    throw new AppError(
      "phoneNumber and roleId are required to create a user",
      400,
    );
  }

  let conditions = {};
  if (phoneNumber) {
    conditions.phoneNumber = phoneNumber;
  }
  if (email) {
    conditions.email = email;
  }

  const savedUser = await getData({
    tableName: "Users",
    conditions,
    operator: "OR",
    connection,
  });
  if (savedUser?.length > 1) {
    throw new AppError("phone or email is reserved in another user", 409);
  }

  if (savedUser.length >= 1) {
    const existingUser = savedUser[0];

    if (phoneNumber !== existingUser.phoneNumber) {
      throw new AppError("Wrong phone match to current email", 400);
    }

    const savedEmail = existingUser?.email;

    if (roleId === 2) {
      // [Rule 1] Prevent verified email changes
      if (
        savedEmail &&
        !savedEmail.startsWith("fakeEmail_") &&
        !savedEmail.endsWith("@passenger.com") &&
        email &&
        email !== savedEmail
      ) {
        throw new AppError("Wrong email match to current phone number", 400);
      }

      // [Rule 2] Allow fake email replacement
      if (
        ((savedEmail?.startsWith("fakeEmail_") &&
          savedEmail?.endsWith("@passenger.com")) ||
          !savedEmail) &&
        email
      ) {
        await updateData({
          tableName: "Users",
          updateValues: { email },
          conditions: { userUniqueId: existingUser.userUniqueId },
          connection, // Pass connection for transaction support
        });
      }

      // [Rule 3] Allow initial name setting
      if (!existingUser?.fullName && fullName) {
        await updateData({
          tableName: "Users",
          updateValues: { fullName },
          conditions: { userUniqueId: existingUser.userUniqueId },
          connection, // Pass connection for transaction support
        });
      }
    }

    // For existing users, pass connection but note that handleExistingUser may not fully support it
    return handleExistingUser({
      user: { ...existingUser },
      roleId,
      statusId,
      userRoleStatusDescription,
      requestedFrom,
      email,
      fullName,
      connection, // Pass connection, though existing users don't need transaction
    });
  }

  // For new users, pass connection to ensure atomic user + credential creation
  return await registerNewUser({
    fullName,
    phoneNumber,
    email,
    roleId,
    statusId,
    userRoleStatusDescription,
    requestedFrom,
    connection, // Pass connection for transaction support
  });
};

const handleUserRoleStatus = async (
  userUniqueId,
  roleId,
  statusId,
  userRoleStatusDescription,
  connection = null, // Optional: connection for transaction support
) => {
  // Check if the UserRole already exists
  const userRole = await getData({
    tableName: "UserRole",
    conditions: { userUniqueId, roleId },
    connection, // Pass connection for transaction support
  });
  let userRoleId = null;

  // if user is not found in this role, register new user role
  if (userRole.length === 0) {
    const insertUserRole = await insertData({
      tableName: "UserRole",
      colAndVal: {
        userRoleUniqueId: uuidv4(),
        userUniqueId,
        roleId,
        userRoleCreatedAt: currentDate(),
        userRoleCreatedBy: userUniqueId,
      },
      connection, // Pass connection for transaction support
    });

    if (insertUserRole.affectedRows > 0) {
      userRoleId = insertUserRole.insertId;
    } else {
      throw new AppError("Failed to register user role", 500);
    }
  } else {
    userRoleId = userRole[0].userRoleId;
  }

  // Check if the UserRole is in UserRoleStatus already exists
  const userRoleStatus = await getData({
    tableName: "UserRoleStatusCurrent",
    conditions: { userRoleId },
    connection, // Pass connection for transaction support
  });

  if (userRoleStatus.length === 0) {
    const colAndVal = {
      userRoleStatusUniqueId: uuidv4(),
      userRoleStatusCreatedBy: userUniqueId,
      userRoleId,
      userRoleStatusDescription,
      // if role is 2, user is a driver, then statusId will be 2 for driver because drivers data must be active after approval by admin
      statusId: roleId === 2 ? 2 : statusId,
      userRoleStatusCreatedAt: currentDate(),
    };

    // Insert new UserRoleStatus if not found
    await insertData({
      tableName: "UserRoleStatusCurrent",
      colAndVal,
      connection, // Pass connection for transaction support
    });
    const newUser = await performJoinSelect({
      baseTable: "Users",
      joins: [
        {
          table: "UserRole",
          on: "Users.userUniqueId = UserRole.userUniqueId",
        },
        {
          table: "UserRoleStatusCurrent",
          on: "UserRole.userRoleId = UserRoleStatusCurrent.userRoleId",
        },
      ],
      conditions: { "Users.userUniqueId": userUniqueId },
      connection, // Pass connection for transaction support (read within transaction)
    });
    // if user is driver send notification to admin to verify its account using driver license etc
    if (roleId === 2) {
      const message = {
        type: "unauthorizedDriver",
        ...newUser[0],
      };
      // Do NOT send socket notifications when inside a transaction (connection provided)
      // Caller should send notifications after transaction commits.
      if (!connection) {
        await sendSocketIONotificationToAdmin({
          message,
        });
      }
    }
    return {
      message: "success",
      data: newUser[0],
    };
  } else {
    return {
      message: "success",
    };
  }
};

// Helper function to update OTP and send notification
const updateOtpForUser = async ({
  userUniqueId,
  OTP,
  phoneNumber,
  hashedOTP,
  connection = null, // Optional: connection for transaction support
}) => {
  const updateOtpResult = await updateData({
    tableName: "usersCredential",
    updateValues: { OTP: hashedOTP },
    conditions: { userUniqueId },
    connection, // Pass connection for transaction support
  });

  if (updateOtpResult.affectedRows > 0) {
    // When inside a transaction (connection provided), defer sending SMS until after commit
    if (connection) {
      return {
        messageDetail: "OTP updated (SMS deferred until after transaction)",
      };
    }

    try {
      const smsResult = await sendSms(phoneNumber, OTP);
      if (smsResult.status === "success" || smsResult.message === "success") {
        return {
          messageDetail: "OTP updated and sent successfully",
        };
      } else {
        return {
          messageDetail: "OTP updated but SMS sending failed (unknown reason)",
        };
      }
    } catch (smsError) {
      logger.warn("SMS sending failed during OTP update", {
        phoneNumber,
        error: smsError.message,
      });
      return {
        messageDetail: `OTP updated but SMS sending failed: ${smsError.message}`,
      };
    }
  } else {
    throw new AppError("Unable to update OTP", 500);
  }
};

const verifyUserByOTP = async (req) => {
  if (!req?.body?.OTP || !req?.body?.phoneNumber) {
    throw new AppError("OTP and phoneNumber are required", 400);
  }
  const { OTP, phoneNumber } = req.body;
  const verifyUserExistence = await performJoinSelect({
    baseTable: "Users",
    joins: [
      {
        table: "usersCredential",
        on: "Users.userUniqueId = usersCredential.userUniqueId",
      },
    ],
    conditions: {
      phoneNumber,
    },
  });

  const roleId = req.body.roleId;

  if (!verifyUserExistence || verifyUserExistence.length === 0) {
    throw new AppError("user not found in verify otp", 404);
  }

  const { userUniqueId, fullName, email } = verifyUserExistence?.[0];
  const hashedOTP = verifyUserExistence?.[0].OTP;

  // verifyPassword now throws AppError on failure if standardized
  await verifyPassword({
    hashedPassword: hashedOTP,
    notHashedPassword: String(OTP),
  });

  const conditions = { roleId, userUniqueId };

  const userInRoleId = await getData({
    tableName: "UserRole",
    conditions,
  });

  if (userInRoleId.length === 0) {
    throw new AppError("user not found in this role", 401);
  }

  const JWTData = createJWT({
    userUniqueId,
    fullName,
    phoneNumber,
    email,
    roleId,
  });

  if (JWTData.message === "error") {
    throw new AppError(JWTData.error || "Token creation failed", 500);
  }

  const token = JWTData.token;
  const resData = {
    token,
    message: "success",
    data: "OTP verified successfully",
  };

  // Only check documents for drivers (roleId === 2)
  if (Number(roleId) !== 2) {
    return resData;
  }

  // if user is driver, check if driver has attached documents
  const documentAndVehicleOfDriver = await driversDocumentVehicleRequirement({
    ownerUserUniqueId: userUniqueId,
    user: verifyUserExistence[0],
  });

  if (documentAndVehicleOfDriver?.message === "error") {
    throw new AppError(
      documentAndVehicleOfDriver.error || "Failed to check requirements",
      500,
    );
  }

  const unAttachedDocumentTypes =
      documentAndVehicleOfDriver?.unAttachedDocumentTypes,
    attachedDocumentsByStatus =
      documentAndVehicleOfDriver?.attachedDocumentsByStatus;
  const PENDING = attachedDocumentsByStatus?.PENDING;
  const REJECTED = attachedDocumentsByStatus?.REJECTED;

  if (
    PENDING?.length > 0 ||
    REJECTED?.length > 0 ||
    unAttachedDocumentTypes?.length > 0
  ) {
    sendSocketIONotificationToAdmin({
      message: { ...documentAndVehicleOfDriver },
    });
  }
  resData.documentAndVehicleOfDriver = documentAndVehicleOfDriver;

  return resData;
};

const getUserByUserUniqueId = async (userUniqueId) => {
  const user = await getData({
    tableName: "Users",
    conditions: { userUniqueId: userUniqueId },
  });
  if (!user || user.length === 0) {
    throw new AppError("User not found", 404);
  }
  return { message: "success", data: user[0] };
};

const getUsersByRoleUniqueId = async (
  roleUniqueId,
  page = 1,
  limit = 10,
  search = "",
  connection = null,
) => {
  const offset = (page - 1) * limit;
  const wildcardQuery = `%${search}%`;

  // Count query
  const countSql = `
    SELECT COUNT(*) AS total
    FROM Users u
    INNER JOIN UserRole ur ON ur.userUniqueId = u.userUniqueId
    INNER JOIN Roles r ON ur.roleId = r.roleId
    INNER JOIN UserRoleStatusCurrent ursc ON ursc.userRoleId = ur.userRoleId
    INNER JOIN Statuses s ON ursc.statusId = s.statusId
    WHERE r.roleUniqueId = ?
    ${
  search
    ? "AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phoneNumber LIKE ?)"
    : ""
}
  `;

  const executor = connection || pool;
  const [countRows] = await executor.query(
    countSql,
    search
      ? [roleUniqueId, wildcardQuery, wildcardQuery, wildcardQuery]
      : [roleUniqueId],
  );
  const total = countRows[0].total;

  // Data query
  const sql = `
    SELECT 
      u.userUniqueId,
      u.fullName,
      u.email,
      u.phoneNumber,
      r.roleName,
      ursc.statusId,
      s.statusName,
      ur.userRoleId,
      ur.userRoleCreatedAt
    FROM Users u
    INNER JOIN UserRole ur ON ur.userUniqueId = u.userUniqueId
    INNER JOIN Roles r ON ur.roleId = r.roleId
    INNER JOIN UserRoleStatusCurrent ursc ON ursc.userRoleId = ur.userRoleId
    INNER JOIN Statuses s ON ursc.statusId = s.statusId
    WHERE r.roleUniqueId = ?
    ${
  search
    ? "AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phoneNumber LIKE ?)"
    : ""
}
    ORDER BY u.userCreatedAt DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await executor.query(
    sql,
    search
      ? [
        roleUniqueId,
        wildcardQuery,
        wildcardQuery,
        wildcardQuery,
        limit,
        offset,
      ]
      : [roleUniqueId, limit, offset],
  );

  return {
    message: "success",
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: rows || [],
  };
};
const loginUser = async (phoneNumber, roleId) => {
  // Early validation
  if (!phoneNumber?.trim() || !roleId) {
    throw new AppError("Phone number and role ID are required.", 400);
  }

  const cleanPhoneNumber = phoneNumber.trim();

  // Single query: getUserByFilterDetailed already returns user + all roles + statuses
  const userDataResult = await getUserByFilterDetailed({
    search: cleanPhoneNumber,
  });

  // Check user exists
  if (!userDataResult?.data?.[0]?.user) {
    throw new AppError(
      "User not found at this phone/email address. Please sign up first.",
      404,
    );
  }

  const userEntry = userDataResult.data?.[0];
  const userData = userEntry?.user;

  // Find the matching role entry from rolesAndStatuses
  const roleEntry = userEntry?.rolesAndStatuses?.find(
    (rs) => rs?.userRoles?.roleId === roleId,
  );

  if (!roleEntry) {
    throw new AppError(
      "User not found at this role using this address. Please sign up for this role first.",
      404,
    );
  }

  // Extract statusId from the same role entry (guaranteed to match the same user)
  const statusId = roleEntry.userRoleStatuses?.statusId;

  const res = await handleExistingUser({
    requestedFrom: "user",
    user: userData,
    roleId,
    statusId,
  });

  return res;
};

const deleteUser = async ({ userUniqueId, deletedBy }, connection = null) => {
  if (!userUniqueId) {
    throw new AppError("userUniqueId is required to delete user", 400);
  }
  const deletedAt = currentDate();
  const isDeleted = true;
  const sql =
    "update Users set deletedAt=?,deletedBy=?,isDeleted=? where userUniqueId=? ";
  const values = [deletedAt, deletedBy, isDeleted, userUniqueId];

  const executor = connection || pool;
  const [deleteResults] = await executor.query(sql, values);

  if (deleteResults.affectedRows === 0) {
    throw new AppError("User not found or already deleted", 404);
  }

  return {
    message: "success",
    data: "user deleted successfully",
  };
};

const getUserByFilterDetailed = async (
  filters = {},
  page = 1,
  limit = 10,
  connection = null,
) => {
  // Normalize pagination
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.max(1, Math.min(100, parseInt(limit) || 10));
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const whereParts = [];
  const params = [];

  // User-level filters
  if (filters.userUniqueId) {
    whereParts.push(`Users.userUniqueId = ?`);
    params.push(filters.userUniqueId);
  }

  if (filters.phoneNumber) {
    whereParts.push(`Users.phoneNumber LIKE ?`);
    params.push(`%${filters.phoneNumber}%`);
  }
  if (filters.email) {
    whereParts.push(`Users.email LIKE ?`);
    params.push(`%${filters.email}%`);
  }
  if (filters.fullName) {
    whereParts.push(`Users.fullName LIKE ?`);
    params.push(`%${filters.fullName}%`);
  }
  if (filters.search) {
    whereParts.push(
      `(Users.fullName LIKE ? OR Users.email LIKE ? OR Users.phoneNumber LIKE ?)`,
    );
    params.push(
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
    );
  }
  if (filters.createdAt) {
    if (filters.createdAt.start && filters.createdAt.end) {
      whereParts.push(`Users.userCreatedAt BETWEEN ? AND ?`);
      params.push(filters.createdAt.start, filters.createdAt.end);
    } else {
      whereParts.push(`DATE(Users.userCreatedAt) = ?`);
      params.push(filters.createdAt);
    }
  }

  // Role/status filters
  if (filters.roleId) {
    whereParts.push(`UserRole.roleId = ?`);
    params.push(filters.roleId);
  }
  if (filters.roleUniqueId) {
    whereParts.push(`Roles.roleUniqueId = ?`);
    params.push(filters.roleUniqueId);
  }
  if (filters.statusId) {
    whereParts.push(`UserRoleStatusCurrent.statusId = ?`);
    params.push(filters.statusId);
  }

  const whereClause =
    whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const sql = `
  SELECT DISTINCT Users.*, 
    UserRole.userRoleId, UserRole.userRoleUniqueId, UserRole.roleId,
    UserRole.userRoleCreatedBy, UserRole.userRoleCreatedAt,
    
    Roles.roleUniqueId, Roles.roleName, Roles.roleDescription,
    
    UserRoleStatusCurrent.userRoleStatusId, UserRoleStatusCurrent.userRoleStatusUniqueId,
    UserRoleStatusCurrent.statusId, UserRoleStatusCurrent.userRoleStatusDescription,
    UserRoleStatusCurrent.userRoleStatusCreatedAt, UserRoleStatusCurrent.userRoleStatusCurrentVersion,
    UserRoleStatusCurrent.userRoleStatusCreatedBy,
    
    Statuses.statusName, Statuses.statusDescription,
    
    BannedUsers.banUniqueId,
    BannedUsers.isActive as banIsActive
    
  FROM Users
  LEFT JOIN UserRole ON Users.userUniqueId = UserRole.userUniqueId AND UserRole.userRoleDeletedAt IS NULL
  LEFT JOIN Roles ON UserRole.roleId = Roles.roleId
  LEFT JOIN UserRoleStatusCurrent ON UserRole.userRoleId = UserRoleStatusCurrent.userRoleId
  LEFT JOIN Statuses ON UserRoleStatusCurrent.statusId = Statuses.statusId
  LEFT JOIN UserDelinquency ON UserRole.userUniqueId = UserDelinquency.userUniqueId and UserRole.roleId = UserDelinquency.roleId
  LEFT JOIN BannedUsers ON UserDelinquency.userDelinquencyUniqueId = BannedUsers.userDelinquencyUniqueId AND BannedUsers.isActive = 1
  ${whereClause}
  ORDER BY Users.userCreatedAt DESC
  LIMIT ? OFFSET ?
`;
  // Updated count SQL
  const countSql = `
    SELECT COUNT(DISTINCT Users.userUniqueId) AS totalCount
    FROM Users
    LEFT JOIN UserRole ON Users.userUniqueId = UserRole.userUniqueId AND UserRole.userRoleDeletedAt IS NULL
    LEFT JOIN Roles ON UserRole.roleId = Roles.roleId
    LEFT JOIN UserRoleStatusCurrent ON UserRole.userRoleId = UserRoleStatusCurrent.userRoleId
    LEFT JOIN Statuses ON UserRoleStatusCurrent.statusId = Statuses.statusId
    LEFT JOIN UserDelinquency ON UserRole.userUniqueId = UserDelinquency.userUniqueId and UserRole.roleId = UserDelinquency.roleId
    LEFT JOIN BannedUsers ON UserDelinquency.userDelinquencyUniqueId = BannedUsers.userDelinquencyUniqueId AND BannedUsers.isActive = 1
    ${whereClause}
  `;
  const executor = connection || pool;
  const [rowsResult, countResult] = await Promise.all([
    executor.query(sql, [...params, limit, offset]),
    executor.query(countSql, params),
  ]);

  const [rows] = rowsResult;
  const [countRows] = countResult;

  const usersMap = new Map();

  rows.forEach((row) => {
    const userUniqueId = row.userUniqueId;

    if (!usersMap.has(userUniqueId)) {
      // Initialize user with the structure you want
      usersMap.set(userUniqueId, {
        user: {
          userId: row.userId,
          userUniqueId: row.userUniqueId,
          fullName: row.fullName,
          phoneNumber: row.phoneNumber,
          email: row.email,
          userCreatedAt: row.userCreatedAt,
          userCreatedBy: row.userCreatedBy,
          userDeletedAt: row.userDeletedAt,
          isDeleted: row.isDeleted,
          userDeletedBy: row.userDeletedBy,
        },
        rolesAndStatuses: [],
        banUniqueId: null, // Will be set if any role has a ban
      });
    }

    const userEntry = usersMap.get(userUniqueId);

    // Add role and status information
    if (row.userRoleId) {
      userEntry.rolesAndStatuses.push({
        userRoles: {
          userRoleId: row.userRoleId,
          userRoleUniqueId: row.userRoleUniqueId,
          roleId: row.roleId,
          roleName: row.roleName,
          banUniqueId: row.banUniqueId, // Add banUniqueId to userRoles
        },
        userRoleStatuses: row.userRoleStatusId
          ? {
            statusId: row.statusId,
            statusName: row.statusName,
            userRoleStatusUniqueId: row.userRoleStatusUniqueId,
          }
          : null,
      });

      // Set the overall banUniqueId for the user if any role is banned
      if (row.banUniqueId && !userEntry.banUniqueId) {
        userEntry.banUniqueId = row.banUniqueId;
      }
    }
  });

  // Convert map to array
  const transformedData = Array.from(usersMap.values());

  const totalCount = countRows[0].totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const paginationInfo = {
    currentPage: page,
    itemsPerPage: limit,
    totalItems: totalCount,
    totalPages,
    offset,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    previousPage: page > 1 ? page - 1 : null,
    startItem: totalCount > 0 ? offset + 1 : 0,
    endItem: Math.min(offset + limit, totalCount),
  };

  return {
    message: transformedData.length > 0 ? "success" : "No users found",
    data: transformedData,
    pagination: paginationInfo,
  };
};

const updateUser = async (body) => {
  const { userUniqueId, fullName, phoneNumber, email, roleId, statusId } = body;

  // Validate required field
  if (!userUniqueId) {
    throw new AppError("userUniqueId is required", 400);
  }

  const updateValues = {};
  const errors = [];

  // Check if email is reserved by another user
  if (email) {
    const userDataByEmail = await getData({
      tableName: "Users",
      conditions: { email },
    });

    if (userDataByEmail?.length > 0) {
      // Check if the found user is different from the current user
      if (userDataByEmail[0].userUniqueId !== userUniqueId) {
        errors.push("Email already exists");
      } else {
        // Same user, can update email
        updateValues.email = email;
      }
    } else {
      // Email doesn't exist in the system, can update
      updateValues.email = email;
    }
  }

  // Check if phone number is reserved by another user
  if (phoneNumber) {
    const userDataByPhoneNumber = await getData({
      tableName: "Users",
      conditions: { phoneNumber },
    });

    if (userDataByPhoneNumber?.length > 0) {
      // Check if the found user is different from the current user
      if (userDataByPhoneNumber[0].userUniqueId !== userUniqueId) {
        errors.push("Phone number already exists");
      } else {
        // Same user, can update phone number
        updateValues.phoneNumber = phoneNumber;
      }
    } else {
      // Phone number doesn't exist in the system, can update
      updateValues.phoneNumber = phoneNumber;
    }
  }

  // Return errors if any
  if (errors.length > 0) {
    throw new AppError(errors.join(", "), 409);
  }

  // Optional fields for update
  if (fullName) {
    updateValues.fullName = fullName;
  }

  // Update the user's information if there are any fields to update
  if (Object.keys(updateValues).length > 0) {
    const updateUserResult = await updateData({
      tableName: "Users",
      updateValues,
      conditions: { userUniqueId },
    });

    if (updateUserResult.affectedRows <= 0) {
      throw new AppError("Failed to update user details", 500);
    }
  }

  // Create new token with updated information
  const tokenData = createJWT({
    userUniqueId,
    fullName: fullName || updateValues.fullName,
    phoneNumber: phoneNumber || updateValues.phoneNumber,
    email: email || updateValues.email,
    roleId: roleId,
    statusId: statusId,
  });

  if (tokenData.message === "error") {
    throw new AppError(tokenData.error || "Token creation failed", 500);
  }

  return {
    token: tokenData.token,
    message: "success",
    data: "User updated successfully",
  };
};

const createUserByAdminOrSuperAdmin = async ({ body, userUniqueId }) => {
  const { fullName, phoneNumber, email, roleId, statusId } = body;
  const userRoleStatusDescription = "";

  const userDataByEmail = await getData({
    tableName: "Users",
    conditions: { email },
  });
  // check if user has credential or not and if not create  credential
  if (userDataByEmail?.[0]) {
    const userUniqueId = userDataByEmail?.[0]?.userUniqueId;
    await ensureCredentialForUser({ userUniqueId });
    await handleUserRoleStatus(
      userUniqueId,
      roleId,
      statusId,
      userRoleStatusDescription,
    );
    // if phone number is different from existing user's phone number return error
    if (phoneNumber && userDataByEmail?.[0]?.phoneNumber !== phoneNumber) {
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
    const userUniqueId = userDataByPhoneNumber?.[0]?.userUniqueId;
    await ensureCredentialForUser({ userUniqueId });

    await handleUserRoleStatus(
      userUniqueId,
      roleId,
      statusId,
      userRoleStatusDescription,
    );
    // if email is different from existing user's email return error
    if (email && userDataByPhoneNumber?.[0]?.email !== email) {
      throw new AppError("There is a difference in email address", 409);
    }
    return {
      message: "success",
      data: "User already exists with this phone number",
    };
  }

  const res = await registerNewUser({
    fullName,
    phoneNumber,
    email,
    roleId,
    statusId,
    userRoleStatusDescription: "",
    requestedFrom: "Supper Admin/Admin",
    createdBy: userUniqueId,
  });
  return res;
};

module.exports = {
  createUserByAdminOrSuperAdmin,
  createUserSystem,
  getUserByUserUniqueId,
  getUsersByRoleUniqueId,
  updateUser,
  verifyUserByOTP,
  createUser,
  deleteUser,
  getUserByFilterDetailed,
  loginUser,
  ensureCredentialForUser,
};
