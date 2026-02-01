const { pool } = require("../Middleware/Database.config");
const { v4: uuidv4 } = require("uuid");
const { currentDate } = require("../Utils/CurrentDate");
const {
  prepareAndCreateNewBalance,
} = require("./UserBalance.service/UserBalance.post.service");
const { sendSocketIONotificationToAdmin } = require("../Utils/Notifications");

const { getData } = require("../CRUD/Read/ReadData");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");
const AppError = require("../Utils/AppError");

// Create
const createUserDeposit = async (data) => {
  const {
    userDepositUniqueId: provideduserDepositUniqueId,
    driverUniqueId,
    depositAmount,
    depositSourceUniqueId,
    accountUniqueId,
    depositTime,
    depositURL,
    depositStatus,
    userDepositCreatedBy,
  } = data;

  // Use provided userDepositUniqueId if available, otherwise generate a new one
  const userDepositUniqueId = provideduserDepositUniqueId || uuidv4();

  const isAutomatic = depositStatus === "PENDING";

  // Check if required fields are provided
  if (!driverUniqueId || !depositAmount || !depositSourceUniqueId) {
    throw new AppError("Missing required fields to create deposit", 400);
  }

  // For manual deposits: accountUniqueId and depositTime are REQUIRED
  if (!isAutomatic) {
    if (!accountUniqueId) {
      throw new AppError(
        "accountUniqueId is required for manual deposits",
        400,
      );
    }
    if (!depositTime) {
      throw new AppError("depositTime is required for manual deposits", 400);
    }
  }

  // Validate depositAmount
  if (isNaN(depositAmount) || depositAmount <= 0) {
    throw new AppError("Invalid deposit amount", 400);
  }

  // Validate depositTime (required for manual, optional for automatic)
  if (depositTime && isNaN(new Date(depositTime).getTime())) {
    throw new AppError("Invalid deposit time", 400);
  }
  // Validate depositURL
  if (depositURL && typeof depositURL !== "string") {
    throw new AppError("Invalid deposit URL", 400);
  }
  // Validate driverUniqueId
  if (typeof driverUniqueId !== "string" || driverUniqueId.length === 0) {
    throw new AppError("Invalid driver unique ID", 400);
  }
  // Validate depositSourceUniqueId
  if (
    typeof depositSourceUniqueId !== "string" ||
    depositSourceUniqueId.length === 0
  ) {
    throw new AppError("Invalid deposit source unique ID", 400);
  }
  // Validate accountUniqueId
  if (
    accountUniqueId &&
    (typeof accountUniqueId !== "string" || accountUniqueId.length === 0)
  ) {
    throw new AppError("Invalid account unique ID", 400);
  }

  // check if depositURL existed before
  if (depositURL) {
    const existedURL = await getData({
      tableName: "UserDeposit",
      conditions: { depositURL: depositURL },
    });
    if (existedURL?.length > 0) {
      throw new AppError("Deposit URL already exists", 400);
    }
  }

  // Default depositStatus to "requested" for manual cases
  const finalDepositStatus = depositStatus || "requested";

  const finalAccountUniqueId = isAutomatic
    ? accountUniqueId || null
    : accountUniqueId;

  const finalDepositTime = isAutomatic
    ? depositTime || currentDate()
    : depositTime;

  // Prepare SQL query
  const sql = `
    INSERT INTO UserDeposit (
      userDepositUniqueId,
      driverUniqueId,
      depositAmount,
      depositSourceUniqueId,
      accountUniqueId,
      depositTime,
      depositURL,
      depositStatus,
      userDepositCreatedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [insertResult] = await pool.query(sql, [
    userDepositUniqueId,
    driverUniqueId,
    depositAmount,
    depositSourceUniqueId,
    finalAccountUniqueId,
    finalDepositTime,
    depositURL,
    finalDepositStatus,
    userDepositCreatedBy || driverUniqueId,
  ]);

  if (!insertResult.affectedRows) {
    throw new AppError("Failed to insert deposit data", 500);
  }

  // Fetch inserted row via consolidated getter
  const fullData = await getUserDeposit({
    userDepositUniqueId,
    driverUniqueId,
    limit: 1,
  });

  const result = Array.isArray(fullData?.data)
    ? fullData.data[0]
    : fullData?.data;
  sendSocketIONotificationToAdmin({
    message: { message: "success", data: result },
  });

  return result;
};

// Removed specialized GET helpers in favor of consolidated getUserDeposit
const getUserDeposit = async (filters = {}) => {
  const {
    driverUniqueId,
    depositStatus,
    includeNullStatus,
    minAmount,
    maxAmount,
    depositAmount,
    startDate,
    endDate,
    depositSourceUniqueId,
    accountUniqueId,
    depositURL,
    depositURLMatch,
    depositURLCaseSensitive,
    userDepositUniqueId,
    userDepositId,
    createdStart,
    createdEnd,
    search,
    page = 1,
    limit = 10,
    sortBy = "depositTime",
    sortOrder = "DESC",
  } = filters;

  const whereConditions = [];
  const params = [];

  if (driverUniqueId) {
    whereConditions.push("dd.driverUniqueId = ?");
    params.push(driverUniqueId);
  }

  if (userDepositUniqueId) {
    whereConditions.push("dd.userDepositUniqueId = ?");
    params.push(userDepositUniqueId);
  }

  if (userDepositId) {
    whereConditions.push("dd.userDepositId = ?");
    params.push(Number(userDepositId));
  }

  if (depositStatus || includeNullStatus) {
    const statusArray = Array.isArray(depositStatus)
      ? depositStatus
      : String(depositStatus || "")
        .split(",")
        .filter(Boolean);

    const hasStatuses = statusArray.length > 0;
    if (includeNullStatus && hasStatuses) {
      const placeholders = statusArray.map(() => "?").join(",");
      whereConditions.push(
        `(dd.depositStatus IN (${placeholders}) OR dd.depositStatus IS NULL)`,
      );
      params.push(...statusArray);
    } else if (includeNullStatus && !hasStatuses) {
      whereConditions.push(`dd.depositStatus IS NULL`);
    } else if (hasStatuses) {
      const placeholders = statusArray.map(() => "?").join(",");
      whereConditions.push(`dd.depositStatus IN (${placeholders})`);
      params.push(...statusArray);
    }
  }

  if (minAmount) {
    whereConditions.push("dd.depositAmount >= ?");
    params.push(parseFloat(minAmount));
  }

  if (maxAmount) {
    whereConditions.push("dd.depositAmount <= ?");
    params.push(parseFloat(maxAmount));
  }

  if (depositAmount) {
    whereConditions.push("dd.depositAmount = ?");
    params.push(parseFloat(depositAmount));
  }

  if (startDate) {
    whereConditions.push("dd.depositTime >= ?");
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push("dd.depositTime <= ?");
    params.push(endDate);
  }

  if (createdStart) {
    whereConditions.push("dd.userDepositCreatedAt >= ?");
    params.push(createdStart);
  }

  if (createdEnd) {
    whereConditions.push("dd.userDepositCreatedAt <= ?");
    params.push(createdEnd);
  }

  if (depositSourceUniqueId) {
    whereConditions.push("dd.depositSourceUniqueId = ?");
    params.push(depositSourceUniqueId);
  }

  if (accountUniqueId) {
    whereConditions.push("dd.accountUniqueId = ?");
    params.push(accountUniqueId);
  }

  if (depositURL) {
    const mode = String(depositURLMatch || "contains").toLowerCase();
    const caseSensitive =
      depositURLCaseSensitive === true ||
      String(depositURLCaseSensitive).toLowerCase() === "true";

    let pattern = `%${depositURL}%`;
    if (mode === "exact") {pattern = `${depositURL}`;}
    if (mode === "startswith") {pattern = `${depositURL}%`;}
    if (mode === "endswith") {pattern = `%${depositURL}`;}

    if (mode === "exact") {
      whereConditions.push(
        caseSensitive
          ? "dd.depositURL COLLATE utf8mb4_bin = ?"
          : "dd.depositURL = ?",
      );
    } else {
      whereConditions.push(
        caseSensitive
          ? "dd.depositURL COLLATE utf8mb4_bin LIKE ?"
          : "dd.depositURL LIKE ?",
      );
    }
    params.push(pattern);
  }

  if (search) {
    const searchTerm = `%${search}%`;
    whereConditions.push(`
      (u.phoneNumber LIKE ? OR u.email LIKE ? OR u.fullName LIKE ?)
    `);
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const numPage = Math.max(1, Number(page) || 1);
  const numLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
  const offset = (numPage - 1) * numLimit;

  const sortableMap = {
    depositTime: "dd.depositTime",
    depositAmount: "dd.depositAmount",
    depositStatus: "dd.depositStatus",
    acceptRejectReason: "dd.acceptRejectReason",
    createdAt: "dd.userDepositCreatedAt",
    userDepositId: "dd.userDepositId",
    userDepositUniqueId: "dd.userDepositUniqueId",
    fullName: "u.fullName",
    phoneNumber: "u.phoneNumber",
    email: "u.email",
  };
  const safeSortBy = sortableMap[sortBy] || sortableMap["depositTime"];
  const safeSortOrder =
    String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const sql = `
    SELECT 
      dd.*, 
      u.fullName,
      u.phoneNumber,
      u.email,
      ds.sourceLabel as depositSourceLabel,
      fia.institutionName,
      fia.accountNumber
    FROM UserDeposit dd
    LEFT JOIN Users u ON dd.driverUniqueId = u.userUniqueId
    LEFT JOIN DepositSource ds ON dd.depositSourceUniqueId = ds.depositSourceUniqueId
    LEFT JOIN FinancialInstitutionAccounts fia ON dd.accountUniqueId = fia.accountUniqueId
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) as total 
    FROM UserDeposit dd
    LEFT JOIN Users u ON dd.driverUniqueId = u.userUniqueId
    ${whereClause}
  `;

  const [data] = await pool.query(sql, [
    ...params,
    Number(numLimit),
    Number(offset),
  ]);
  const [countResult] = await pool.query(countSql, params);

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / numLimit);

  return {
    data,
    pagination: {
      currentPage: Number(numPage),
      totalPages,
      totalItems: total,
      itemsPerPage: Number(numLimit),
      hasNext: Number(numPage) < totalPages,
      hasPrev: Number(numPage) > 1,
    },
    filters: {
      search: search || null,
      driverUniqueId: driverUniqueId || null,
      depositStatus: depositStatus || null,
    },
  };
};
// Removed extra getters (with account info, by ID, etc.) to keep a single GET service

/**
 * Dynamically updates only the fields provided in the data object.
 * Excludes userDepositUniqueId and userDepositId from updates.
 * If depositStatus is being changed to 'approved', adds balance to user account.
 * @param {string} userDepositUniqueId - The unique ID of the deposit to update
 * @param {Object} data - Key-value pairs of columns to update
 * @returns {Object} Success or error message
 */
const updateUserDepositByUniqueId = async (userDepositUniqueId, data) => {
  if (!userDepositUniqueId || !data || Object.keys(data).length === 0) {
    throw new AppError("Missing deposit ID or update data", 400);
  }

  // Check if depositStatus is being changed to 'approved'
  const isApproving = data.depositStatus === "approved";

  if (isApproving) {
    // Get current deposit data to check status and get amount
    const depositFetch = await getUserDeposit({
      userDepositUniqueId,
      limit: 1,
    });
    const depositData = Array.isArray(depositFetch?.data)
      ? depositFetch.data[0]
      : depositFetch?.data;

    if (!depositData) {
      throw new AppError("Deposit not found", 404);
    }

    const savedDepositStatus = depositData?.depositStatus;

    // If already approved, skip balance addition
    if (savedDepositStatus === "approved") {
      return depositData;
    }

    const depositAmount = depositData?.depositAmount;
    const driverUniqueId = depositData?.driverUniqueId;

    // Use transaction to ensure atomicity
    await executeInTransaction(async (connection) => {
      // 1. Add balance for approved deposit
      // Note: prepareAndCreateNewBalance now throws AppError
      await prepareAndCreateNewBalance({
        addOrDeduct: "add",
        amount: depositAmount,
        driverUniqueId,
        transactionType: "Deposit",
        transactionUniqueId: userDepositUniqueId,
        userBalanceCreatedBy: driverUniqueId,
      });

      // 2. Update deposit with provided data
      const excludedFields = [
        "userDepositUniqueId",
        "userDepositId",
        "userDepositCreatedBy",
        "userDepositCreatedAt",
      ];
      const allowedFields = Object.keys(data).filter(
        (key) => !excludedFields.includes(key),
      );

      if (allowedFields.length === 0) {
        throw new AppError("No valid fields to update", 400);
      }

      const setClause = allowedFields.map((field) => `${field} = ?`).join(", ");
      const values = allowedFields.map((field) => data[field]);

      const updateSql = `UPDATE UserDeposit SET ${setClause}, userDepositUpdatedAt = ? WHERE userDepositUniqueId = ?`;
      const [updateResult] = await connection.query(updateSql, [
        ...values,
        currentDate(),
        userDepositUniqueId,
      ]);

      if (updateResult.affectedRows === 0) {
        throw new AppError("Deposit not found or update failed", 404);
      }
    });

    // Fetch updated deposit data after successful transaction
    const updatedDepositFetch = await getUserDeposit({
      userDepositUniqueId,
      limit: 1,
    });
    return Array.isArray(updatedDepositFetch?.data)
      ? updatedDepositFetch.data[0]
      : updatedDepositFetch?.data;
  } else {
    // Not approving, just do regular update
    const excludedFields = [
      "userDepositUniqueId",
      "userDepositId",
      "userDepositCreatedBy",
      "userDepositCreatedAt",
    ];
    const allowedFields = Object.keys(data).filter(
      (key) => !excludedFields.includes(key),
    );

    if (allowedFields.length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    // Build dynamic SET clause
    const setClause = allowedFields.map((field) => `${field} = ?`).join(", ");
    const values = allowedFields.map((field) => data[field]);

    // Add timestamp
    const sql = `UPDATE UserDeposit SET ${setClause}, userDepositUpdatedAt = ? WHERE userDepositUniqueId = ?`;
    const [result] = await pool.query(sql, [
      ...values,
      currentDate(),
      userDepositUniqueId,
    ]);

    if (result.affectedRows === 0) {
      throw new AppError("Update failed or deposit not found", 404);
    }

    // Fetch updated deposit data
    const updatedDepositFetch = await getUserDeposit({
      userDepositUniqueId,
      limit: 1,
    });
    return Array.isArray(updatedDepositFetch?.data)
      ? updatedDepositFetch.data[0]
      : updatedDepositFetch?.data;
  }
};

// Delete
const deleteUserDepositByUniqueId = async (userDepositUniqueId) => {
  const sql = `DELETE FROM UserDeposit WHERE userDepositUniqueId = ?`;
  const [result] = await pool.query(sql, [userDepositUniqueId]);

  if (result.affectedRows === 0) {
    throw new AppError("Delete failed or deposit not found", 404);
  }

  return `Deleted: ${userDepositUniqueId}`;
};

/**
 * @function updateUserDepositStatusService
 * @description Updates the deposit status of a specific driver deposit record.
 *
 * @param {string} userDepositUniqueId - The unique ID of the deposit.
 * @param {"approved" | "rejected"} newStatus - The new status to set.
 * @returns {Promise<Object>} - A success or failure response.
 */
const updateUserDepositStatusService = async ({
  userDepositUniqueId,
  newStatus,
  acceptRejectReason,
}) => {
  const allowedStatuses = ["approved", "rejected"];
  if (!allowedStatuses.includes(newStatus)) {
    throw new AppError("Invalid deposit status", 400);
  }

  // Load deposit using consolidated getter
  const depositFetch = await getUserDeposit({
    userDepositUniqueId,
    limit: 1,
  });
  const depositData = Array.isArray(depositFetch?.data)
    ? depositFetch.data[0]
    : depositFetch?.data;

  if (!depositData) {
    throw new AppError("Deposit not found", 404);
  }
  const depositStatus = depositData?.depositStatus;
  if (newStatus === depositStatus && depositStatus === "approved") {
    return depositData;
  }
  const depositAmount = depositData.depositAmount;
  const driverUniqueId = depositData.driverUniqueId;

  await executeInTransaction(async (connection) => {
    // Only update balance if newStatus is 'approved'
    if (newStatus === "approved") {
      // Note: prepareAndCreateNewBalance now throws AppError
      await prepareAndCreateNewBalance({
        addOrDeduct: "add",
        amount: depositAmount,
        driverUniqueId,
        transactionType: "Deposit",
        transactionUniqueId: userDepositUniqueId,
        userBalanceCreatedBy: driverUniqueId,
      });
    }

    // Update deposit status
    const sql = `UPDATE UserDeposit SET depositStatus = ?, acceptRejectReason = ? WHERE userDepositUniqueId = ?`;
    const [updateResult] = await connection.query(sql, [
      newStatus,
      acceptRejectReason || "null",
      userDepositUniqueId,
    ]);

    if (updateResult.affectedRows === 0) {
      throw new AppError("Deposit not found or already updated", 404);
    }
  });

  // Fetch updated deposit data with enriched fields
  const updatedDepositFetch = await getUserDeposit({
    userDepositUniqueId,
    limit: 1,
  });
  return Array.isArray(updatedDepositFetch?.data)
    ? updatedDepositFetch.data[0]
    : updatedDepositFetch?.data;
};

const initiateSantimPayPaymentService = async ({
  driverUniqueId,
  depositAmount,
  phoneNumber = "",
}) => {
  const { generatePaymentUrl } = require("../Utils/SantimPayService");
  const { createDepositSource } = require("./DepositSource.service");

  // 1. Get or create SantimPay deposit source
  // Note: createDepositSource should also be refactored, assuming it might return older format for now
  // but if it's already refactored it would throw or return data.
  // Checking typical pattern:
  const depositSourceResult = await createDepositSource({
    sourceKey: "santimpay",
    sourceLabel: "SantimPay Automatic Payment",
  });

  // Handle older format if still exists, but transition to data directly
  const depositSourceUniqueId = depositSourceResult?.data
    ? depositSourceResult.data.depositSourceUniqueId
    : depositSourceResult.depositSourceUniqueId;

  if (!depositSourceUniqueId) {
    throw new AppError("Failed to get deposit source", 500);
  }

  const userDepositUniqueId = uuidv4();
  const paymentReason = `Driver Deposit - ${depositAmount} ETB`;

  const depositURL = userDepositUniqueId;

  const depositData = {
    userDepositUniqueId,
    driverUniqueId,
    depositAmount: parseFloat(depositAmount),
    depositSourceUniqueId,
    depositURL,
    depositStatus: "PENDING",
  };

  await createUserDeposit(depositData);

  // 4. Generate SantimPay payment URL
  const paymentUrl = await generatePaymentUrl(
    userDepositUniqueId,
    parseFloat(depositAmount),
    paymentReason,
    phoneNumber,
  );

  return {
    userDepositUniqueId,
    paymentUrl,
    depositAmount: parseFloat(depositAmount),
    status: "PENDING",
  };
};

const handleSantimPayWebhookService = async ({ webhookData }) => {
  const { txnId, thirdPartyId, Status, amount, paymentVia, message } =
    webhookData;

  if (!txnId || !thirdPartyId || !Status) {
    throw new AppError(
      "Missing required webhook fields: txnId, thirdPartyId, or status",
      400,
    );
  }

  const depositResult = await getUserDeposit({
    userDepositUniqueId: thirdPartyId,
    limit: 1,
  });

  const deposit =
    depositResult.data && Array.isArray(depositResult.data)
      ? depositResult.data[0]
      : null;

  if (!deposit) {
    throw new AppError(
      `Deposit not found for userDepositUniqueId: ${thirdPartyId}`,
      404,
    );
  }

  if (deposit.depositStatus === "COMPLETED" && deposit.depositURL === txnId) {
    return "Webhook already processed";
  }

  let newStatus;
  switch (Status.toUpperCase()) {
  case "COMPLETED":
    newStatus = "COMPLETED";
    break;
  case "FAILED":
  case "DECLINED":
    newStatus = "FAILED";
    break;
  case "PENDING":
    newStatus = "PENDING";
    break;
  default:
    newStatus = "PENDING";
  }

  const depositTime = currentDate();

  const updateSql = `
    UPDATE UserDeposit
    SET
      depositStatus = ?,
      depositURL = ?,
      depositTime = ?,
      acceptRejectReason = ?
    WHERE userDepositUniqueId = ?
  `;

  const reasonData = {
    reason: message || `Payment via ${paymentVia || "SantimPay"}`,
    paymentVia: paymentVia || null,
  };
  const reasonMessage = JSON.stringify(reasonData);

  const [updateResult] = await pool.query(updateSql, [
    newStatus,
    txnId,
    depositTime,
    reasonMessage,
    thirdPartyId,
  ]);

  if (updateResult.affectedRows === 0) {
    throw new AppError("Failed to update deposit", 500);
  }

  if (newStatus === "COMPLETED") {
    // Note: prepareAndCreateNewBalance now throws AppError
    await prepareAndCreateNewBalance({
      addOrDeduct: "add",
      amount: parseFloat(amount),
      driverUniqueId: deposit.driverUniqueId,
      transactionType: "Deposit",
      transactionUniqueId: thirdPartyId,
      userBalanceCreatedBy: deposit.driverUniqueId,
    });
  }

  return {
    userDepositUniqueId: thirdPartyId,
    txnId,
    status: newStatus,
    updated: true,
  };
};

module.exports = {
  updateUserDepositStatusService,
  getUserDeposit,
  createUserDeposit,
  updateUserDepositByUniqueId,
  deleteUserDepositByUniqueId,
  initiateSantimPayPaymentService,
  handleSantimPayWebhookService,
};
