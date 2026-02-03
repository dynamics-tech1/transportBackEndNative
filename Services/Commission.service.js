const { v4: uuidv4 } = require("uuid");
const { pool } = require("../Middleware/Database.config");
const { currentDate } = require("../Utils/CurrentDate");
const AppError = require("../Utils/AppError");
const logger = require("../Utils/logger");
const { journeyStatusMap } = require("../Utils/ListOfSeedData");
const {
  prepareAndCreateNewBalance,
} = require("./UserBalance.service/UserBalance.post.service");

// Cached commission status ID (lazy loaded)
let cachedCommissionStatusId = null;

// Cached commission rate data (lazy loaded)
let cachedCommissionRateData = null;

// Get cached commission status ID, query on first access only
const getCommissionStatusId = async () => {
  if (cachedCommissionStatusId) {
    return cachedCommissionStatusId;
  }

  const [commissionStatusData] = await pool.query(
    `SELECT commissionStatusUniqueId FROM CommissionStatus WHERE statusName = 'PAID'`,
    [],
  );

  if (commissionStatusData.length === 0) {
    throw new AppError("Commission status 'PAID' not found", 404);
  }

  cachedCommissionStatusId = commissionStatusData?.[0].commissionStatusUniqueId;
  return cachedCommissionStatusId;
};

// Get cached commission rate data, query on first access only
const getCommissionRateData = async () => {
  if (cachedCommissionRateData) {
    return cachedCommissionRateData;
  }

  const [commissionRateData] = await pool.query(
    `SELECT commissionRateUniqueId, commissionRate AS commissionRateValue FROM CommissionRates WHERE commissionRateDeletedAt IS NULL LIMIT 1`,
    [],
  );

  if (commissionRateData.length === 0) {
    throw new AppError("Commission rate not found", 404);
  }

  cachedCommissionRateData = {
    commissionRateUniqueId: commissionRateData?.[0].commissionRateUniqueId,
    commissionRateValue: commissionRateData?.[0].commissionRateValue,
  };
  return cachedCommissionRateData;
};

const allowedSortFields = {
  commissionId: "c.commissionId",
  commissionAmount: "c.commissionAmount",
  paymentTime: "jp.paymentTime",
  driverName: "u.fullName",
  passengerName: "u_pass.fullName",
  commissionStatus: "cs.statusName",
};

async function executeInTransaction(callback) {
  const connection = await pool.getConnection();
  const startTime = currentDate();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();

    // Log successful transaction
    logger.debug("Transaction committed", {
      duration: `${currentDate() - startTime}ms`,
    });

    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function validateCommissionData(data) {
  // Additional business logic validation
  if (data.commissionAmount <= 0) {
    throw new AppError("Commission amount must be greater than 0", 400);
  }

  if (data.commissionAmount > 999999.99) {
    throw new AppError("Commission amount exceeds maximum limit", 400);
  }
}

async function createCommission({
  journeyDecisionUniqueId,
  paymentAmount,
  commissionCreatedBy,
  connection, // Optional: use existing connection if provided
}) {
  validateCommissionData({ commissionAmount: paymentAmount }); // Basic validation on payment amount

  // If connection provided, use it directly; otherwise create transaction
  if (connection) {
    return await createCommissionInConnection(connection, {
      journeyDecisionUniqueId,
      paymentAmount,
      commissionCreatedBy,
    });
  } else {
    return executeInTransaction(async (conn) => {
      return await createCommissionInConnection(conn, {
        journeyDecisionUniqueId,
        paymentAmount,
        commissionCreatedBy,
      });
    });
  }
}

// Helper function to create commission using provided connection
async function createCommissionInConnection(
  connection,
  { journeyDecisionUniqueId, paymentAmount, commissionCreatedBy },
) {
  // Get commission rate data using cached function
  const { commissionRateUniqueId, commissionRateValue } =
    await getCommissionRateData();

  // Calculate commission amount
  const commissionAmount = paymentAmount * commissionRateValue;

  // Validate calculated commission amount
  validateCommissionData({ commissionAmount });

  // Get commission status using cached function
  const commissionStatusUniqueId = await getCommissionStatusId();

  // 1. Verify journey decision exists
  const [journeyData] = await connection.query(
    `SELECT jd.journeyDecisionUniqueId, jd.journeyStatusId, dr.driverUniqueId
     FROM JourneyDecisions jd
     JOIN DriverRequest dr ON jd.driverRequestUniqueId = dr.driverRequestId
     WHERE jd.journeyDecisionUniqueId = ?`,
    [journeyDecisionUniqueId],
  );

  if (journeyData.length === 0) {
    throw new AppError(
      {
        message: "Journey Decision not found",
        code: "JOURNEY_NOT_FOUND",
      },
      404,
    );
  }

  // Check if journey is completed (commission only for completed journeys)
  if (journeyData[0].journeyStatusId !== journeyStatusMap.journeyCompleted) {
    throw new AppError(
      {
        message: "Commissions can only be created for completed journeys",
        code: "INVALID_JOURNEY_STATUS",
        details: `Current status is ${journeyData[0].journeyStatusId}`,
      },
      400,
    );
  }

  // 2. Check for existing commission
  const [existingCommission] = await connection.query(
    `SELECT commissionUniqueId
     FROM Commission
     WHERE journeyDecisionUniqueId = ?
     AND commissionDeletedAt IS NULL`,
    [journeyDecisionUniqueId],
  );

  if (existingCommission.length > 0) {
    throw new AppError(
      {
        message: "Commission already exists for this journey",
        code: "DUPLICATE_COMMISSION",
      },
      409,
    );
  }

  // 3. Verify commission rate exists (already fetched via cache, but double-check)
  const [rateExists] = await connection.query(
    `SELECT commissionRateId, commissionRate AS commissionRateValue FROM CommissionRates WHERE commissionRateUniqueId = ? AND commissionRateDeletedAt IS NULL`,
    [commissionRateUniqueId],
  );

  if (rateExists.length === 0) {
    throw new AppError(
      {
        message: "Active commission rate not found",
        code: "RATE_NOT_FOUND",
      },
      404,
    );
  }

  // 4. Verify commission Status Exists (already fetched via cache, but double-check)
  const [statusExists] = await connection.query(
    `SELECT commissionStatusId FROM CommissionStatus WHERE commissionStatusUniqueId = ?`,
    [commissionStatusUniqueId],
  );

  if (statusExists.length === 0) {
    throw new AppError("Invalid Commission Status Unique ID", 400);
  }

  // 5. Create commission
  const commissionUniqueId = uuidv4();
  const values = {
    commissionUniqueId,
    journeyDecisionUniqueId,
    commissionRateUniqueId,
    commissionAmount,
    commissionStatusUniqueId,
    commissionCreatedBy,
    commissionCreatedAt: currentDate(),
  };

  await connection.query(`INSERT INTO Commission SET ?`, [values]);

  // 6. Get created commission with details
  const [commissionData] = await connection.query(
    `SELECT
      c.*,
      cr.commissionRate AS commissionRateValue,
      cs.statusName as commissionStatus
     FROM Commission c
     JOIN CommissionRates cr ON c.commissionRateUniqueId = cr.commissionRateUniqueId
     JOIN CommissionStatus cs ON c.commissionStatusUniqueId = cs.commissionStatusUniqueId
     WHERE c.commissionUniqueId = ?`,
    [commissionUniqueId],
  );

  // Log business event
  logger.application.commissionCreated(commissionData[0], commissionCreatedBy);

  // Deduct commission from driver balance
  const driverUniqueId = journeyData[0].driverUniqueId;

  await prepareAndCreateNewBalance({
    addOrDeduct: "deduct",
    amount: commissionAmount,
    driverUniqueId: driverUniqueId,
    transactionUniqueId: commissionUniqueId,
    transactionType: "Commission",
    userBalanceCreatedBy: commissionCreatedBy,
  });

  return {
    message: "Commission created successfully",
    data: commissionData[0],
    code: "COMMISSION_CREATED",
  };
}

async function getAllCommissions(filters = {}) {
  const startTime = currentDate();
  try {
    // Build safe WHERE clause
    const conditions = ["c.commissionDeletedAt IS NULL"];
    const values = [];

    // Helper function to add conditions safely
    const addCondition = (field, value, operator = "=") => {
      if (value !== undefined && value !== null && value !== "") {
        conditions.push(`${field} ${operator} ?`);
        values.push(value);
      }
    };

    const addLikeCondition = (field, value) => {
      if (value) {
        conditions.push(`${field} LIKE ?`);
        values.push(`%${value}%`);
      }
    };

    const addRangeCondition = (field, min, max) => {
      if (min !== undefined) {
        conditions.push(`${field} >= ?`);
        values.push(parseFloat(min));
      }
      if (max !== undefined) {
        conditions.push(`${field} <= ?`);
        values.push(parseFloat(max));
      }
    };

    const addDateRangeCondition = (field, start, end) => {
      if (start) {
        conditions.push(`${field} >= ?`);
        values.push(
          new Date(start).toISOString().slice(0, 19).replace("T", " "),
        );
      }
      if (end) {
        conditions.push(`${field} <= ?`);
        values.push(new Date(end).toISOString().slice(0, 19).replace("T", " "));
      }
    };

    // Apply filters
    addCondition("jp.paymentUniqueId", filters.paymentUniqueId);
    addCondition("c.commissionRateUniqueId", filters.commissionRateUniqueId);
    addCondition("u.userUniqueId", filters.driverUniqueId);
    addCondition("u_pass.userUniqueId", filters.passengerUniqueId);
    addCondition(
      "c.commissionStatusUniqueId",
      filters.commissionStatusUniqueId,
    );

    addLikeCondition("u.fullName", filters.driverName);
    addLikeCondition("u.phoneNumber", filters.driverPhone);
    addLikeCondition("u.email", filters.driverEmail);
    addLikeCondition("u_pass.fullName", filters.passengerName);
    addLikeCondition("u_pass.phoneNumber", filters.passengerPhone);
    addLikeCondition("u_pass.email", filters.passengerEmail);

    addRangeCondition(
      "c.commissionAmount",
      filters.commissionAmountMin,
      filters.commissionAmountMax,
    );
    addDateRangeCondition("jp.paymentTime", filters.startDate, filters.endDate);

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Safe sorting
    const sortField =
      allowedSortFields[filters.sortBy] || allowedSortFields.commissionId;
    const sortOrder =
      filters.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Pagination
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(filters.limit) || 10), 100);
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Commission c
      JOIN CommissionStatus cs ON c.commissionStatusUniqueId = cs.commissionStatusUniqueId
      JOIN JourneyPayments jp ON c.journeyDecisionUniqueId = jp.journeyDecisionUniqueId
      JOIN JourneyDecisions jd ON c.journeyDecisionUniqueId = jd.journeyDecisionUniqueId
      JOIN DriverRequest dr ON jd.driverRequestId = dr.driverRequestId
      JOIN Users u ON dr.userUniqueId = u.userUniqueId
      JOIN PassengerRequest pr ON jd.passengerRequestId = pr.passengerRequestId
      JOIN Users u_pass ON pr.userUniqueId = u_pass.userUniqueId
      ${whereClause}
    `;
    // Logging query in dev
    logger.application.databaseQuery(
      countQuery,
      values,
      currentDate() - startTime,
    );

    const [countResult] = await pool.query(countQuery, values);
    const totalCount = countResult[0]?.total || 0;

    if (totalCount === 0) {
      return {
        message: "No commissions found",
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          limit,
          hasNext: false,
          hasPrev: false,
        },
        code: "NO_COMMISSIONS_FOUND",
      };
    }

    // Get paginated data
    const dataQuery = `
      SELECT
        c.*,
        cs.statusName as commissionStatus,
        jp.paymentTime,
        jp.paymentAmount,
        u.fullName as driverName,
        u.phoneNumber as driverPhone,
        u.email as driverEmail,
        u.userUniqueId as driverUniqueId,
        u_pass.fullName as passengerName,
        u_pass.phoneNumber as passengerPhone,
        u_pass.email as passengerEmail,
        u_pass.userUniqueId as passengerUniqueId,
        cr.commissionRateValue,
        cr.commissionRateName
      FROM Commission c
      JOIN CommissionStatus cs ON c.commissionStatusUniqueId = cs.commissionStatusUniqueId
      JOIN JourneyPayments jp ON c.journeyDecisionUniqueId = jp.journeyDecisionUniqueId
      JOIN JourneyDecisions jd ON c.journeyDecisionUniqueId = jd.journeyDecisionUniqueId
      JOIN DriverRequest dr ON jd.driverRequestId = dr.driverRequestId
      JOIN Users u ON dr.userUniqueId = u.userUniqueId
      JOIN PassengerRequest pr ON jd.passengerRequestId = pr.passengerRequestId
      JOIN Users u_pass ON pr.userUniqueId = u_pass.userUniqueId
      JOIN CommissionRates cr ON c.commissionRateUniqueId = cr.commissionRateUniqueId
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataQuery, [...values, limit, offset]);

    logger.debug("Commission Query Results", {
      type: "COMMISSION_QUERY",
      filterCount: Object.keys(filters).length,
      resultCount: rows.length,
      page: page,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: "Commissions retrieved successfully",
      data: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      code: "COMMISSIONS_RETRIEVED",
    };
  } catch (error) {
    logger.application.databaseError(error, "getAllCommissions", filters);
    throw new AppError(
      {
        message: "Failed to retrieve commissions",
        code: "DATABASE_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      500,
    );
  }
}

async function updateCommission(id, data, updatedBy) {
  const fields = [];
  const values = [];

  if (data.commissionStatusUniqueId) {
    fields.push("commissionStatusUniqueId = ?");
    values.push(data.commissionStatusUniqueId);
  }

  if (data.journeyDecisionUniqueId) {
    fields.push("journeyDecisionUniqueId = ?");
    values.push(data.journeyDecisionUniqueId);
  }
  if (data.commissionRateUniqueId) {
    fields.push("commissionRateUniqueId = ?");
    values.push(data.commissionRateUniqueId);
  }
  if (data.commissionAmount) {
    fields.push("commissionAmount = ?");
    values.push(data.commissionAmount);
  }

  if (fields.length === 0) {
    throw new AppError("No fields to update", 400);
  }

  fields.push("commissionUpdatedBy = ?");
  values.push(updatedBy);

  // Add ID for WHERE clause
  values.push(id);

  const sql = `
     UPDATE Commission
     SET ${fields.join(", ")}
     WHERE commissionUniqueId = ? AND commissionDeletedAt IS NULL
   `;

  try {
    const [result] = await pool.query(sql, values);

    if (result.affectedRows === 0) {
      throw new AppError("Commission not found or could not be updated", 404);
    }

    logger.info("Commission Updated", {
      commissionId: id,
      updatedBy,
      updates: data,
    });
    return {
      message: "Commission record updated successfully",
      data: result,
    };
  } catch (error) {
    logger.application.databaseError(error, sql, values);
    throw error;
  }
}

async function deleteCommission(id, deletedBy) {
  const sql = `
    UPDATE Commission
    SET commissionDeletedAt = ?, commissionDeletedBy = ?
    WHERE commissionUniqueId = ? AND commissionDeletedAt IS NULL
  `;
  try {
    const [result] = await pool.query(sql, [currentDate(), deletedBy, id]);

    if (result.affectedRows === 0) {
      throw new AppError("Commission not found or already deleted", 404);
    }

    logger.info("Commission Deleted", { commissionId: id, deletedBy });

    return {
      message: "success",
      data: `Commission with ID ${id} deleted successfully`,
    };
  } catch (error) {
    logger.application.databaseError(error, sql, [deletedBy, id]);
    throw new AppError("Failed to delete commission", 500);
  }
}

module.exports = {
  createCommission,
  getAllCommissions,
  updateCommission,
  deleteCommission,
  validateCommissionData,
  executeInTransaction,
};
