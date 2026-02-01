const { v4: uuidv4 } = require("uuid");
const { pool } = require("../Middleware/Database.config");
const { getData } = require("../CRUD/Read/ReadData");
const { currentDate } = require("../Utils/CurrentDate");
const AppError = require("../Utils/AppError");

// Create a new payment (DEPRECATED - Use JourneyPayments.service.js instead)
exports.createPayment = async (
  journeyDecisionUniqueId,
  amount,
  paymentMethodUniqueId,
  paymentStatusUniqueId,
  paymentTime,
) => {
  const existedPayment = await getData({
    tableName: "JourneyPayments",
    conditions: { journeyDecisionUniqueId },
  });
  if (existedPayment.length > 0) {
    throw new AppError("Payment already exists for this journey", 400);
  }
  const paymentUniqueId = uuidv4();
  const sql = `INSERT INTO JourneyPayments (paymentUniqueId, journeyDecisionUniqueId, amount, paymentMethodUniqueId, paymentStatusUniqueId, paymentTime) VALUES (?, ?, ?, ?, ?, ?)`;
  const values = [
    paymentUniqueId,
    journeyDecisionUniqueId,
    amount,
    paymentMethodUniqueId,
    paymentStatusUniqueId,
    currentDate(),
  ];
  const [result] = await pool.query(sql, values);

  return {
    message: "success",
    data: {
      paymentUniqueId,
      journeyDecisionUniqueId,
      amount,
      paymentMethodUniqueId,
      paymentStatusUniqueId,
      paymentTime,
      paymentId: result.insertId,
    },
  };
};

// Get all payments (DEPRECATED - Use JourneyPayments.service.js instead)
exports.getAllPayments = async () => {
  const sql = `SELECT * FROM JourneyPayments LIMIT 30`; // Retrieve only the last 30 entries
  const [result] = await pool.query(sql);

  return { message: "success", data: result };
};

// Get a specific payment by ID (DEPRECATED - Use JourneyPayments.service.js instead)
exports.getPaymentById = async (paymentId) => {
  const sql = `SELECT * FROM JourneyPayments WHERE paymentId = ?`;
  const [result] = await pool.query(sql, [paymentId]);

  if (result.length === 0) {
    throw new AppError("Payment not found", 404);
  }

  return { message: "success", data: result[0] };
};

// Get payments by user (DEPRECATED - Use JourneyPayments.service with filters instead)
exports.getPaymentsByUserUniqueId = async (params, userUniqueId) => {
  const fromDate = params?.fromDate,
    toDate = params?.toDate;
  let sql = null,
    result = null,
    values = [];

  if (fromDate === "lastTen" && toDate === "lastTen") {
    // Get last 10 payments for driver via JOIN
    sql = `
      SELECT jp.* 
      FROM JourneyPayments jp
      JOIN JourneyDecisions jd ON jp.journeyDecisionUniqueId = jd.journeyDecisionUniqueId
      JOIN DriverRequest dr ON jd.driverRequestId = dr.driverRequestId
      WHERE dr.userUniqueId = ? 
      ORDER BY jp.paymentId DESC 
      LIMIT 10
    `;
    values = [userUniqueId];
    result = (await pool.query(sql, values))?.[0];
  } else {
    sql = `
      SELECT jp.* 
      FROM JourneyPayments jp
      JOIN JourneyDecisions jd ON jp.journeyDecisionUniqueId = jd.journeyDecisionUniqueId
      JOIN DriverRequest dr ON jd.driverRequestId = dr.driverRequestId
      WHERE dr.userUniqueId = ? AND jp.paymentTime BETWEEN ? AND ? 
      ORDER BY jp.paymentId DESC
    `;
    values = [userUniqueId, fromDate, toDate];
    result = (await pool.query(sql, values))?.[0];
  }

  return { message: "success", data: result || [] };
};

// Update a specific payment by ID (DEPRECATED - Use JourneyPayments.service.js instead)
exports.updatePayment = async (
  paymentId,
  amount,
  paymentMethodUniqueId,
  paymentStatusUniqueId,
  paymentTime,
) => {
  const sql = `UPDATE JourneyPayments SET amount = ?, paymentMethodUniqueId = ?, paymentStatusUniqueId = ?, paymentTime = ? WHERE paymentId = ?`;
  const values = [
    amount,
    paymentMethodUniqueId,
    paymentStatusUniqueId,
    paymentTime,
    paymentId,
  ];
  const [result] = await pool.query(sql, values);

  if (result.affectedRows === 0) {
    throw new AppError("Failed to update payment or payment not found", 404);
  }

  return {
    message: "success",
    data: {
      paymentId,
      amount,
      paymentMethodUniqueId,
      paymentStatusUniqueId,
      paymentTime,
    },
  };
};

// Delete a specific payment by ID (DEPRECATED - Use JourneyPayments.service.js instead)
exports.deletePayment = async (paymentId) => {
  const sql = `DELETE FROM JourneyPayments WHERE paymentId = ?`;
  const [result] = await pool.query(sql, [paymentId]);

  if (result.affectedRows === 0) {
    throw new AppError("Failed to delete payment or payment not found", 404);
  }

  return {
    message: "success",
    data: `Payment with ID ${paymentId} deleted successfully`,
  };
};
