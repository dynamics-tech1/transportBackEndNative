const { pool } = require("../Middleware/Database.config");
const { v4: uuidv4 } = require("uuid");
const { currentDate } = require("../Utils/CurrentDate");
const AppError = require("../Utils/AppError");

// Create
const createDepositSource = async ({ sourceKey, sourceLabel, user }) => {
  const depositSourceUniqueId = uuidv4();

  const checkSql = `SELECT * FROM DepositSource WHERE sourceKey = ?`;
  const [existing] = await pool.query(checkSql, [sourceKey]);

  if (existing.length > 0) {
    return { message: "success", data: { ...existing[0] } };
  }

  const createdBy = user?.userUniqueId || depositSourceUniqueId;
  const sql = `
    INSERT INTO DepositSource (depositSourceUniqueId, sourceKey, sourceLabel, depositSourceCreatedBy, depositSourceCreatedAt)
    VALUES (?, ?, ?, ?, ?)
  `;
  await pool.query(sql, [
    depositSourceUniqueId,
    sourceKey,
    sourceLabel,
    createdBy,
    currentDate(),
  ]);

  return {
    message: "success",
    data: {
      depositSourceUniqueId,
      sourceKey,
      sourceLabel,
    },
  };
};

// Get all
const getAllDepositSources = async () => {
  const sql = `SELECT * FROM DepositSource ORDER BY depositSourceCreatedAt DESC`;
  const [result] = await pool.query(sql);
  return { message: "success", data: result };
};

// Get by UUID
const getDepositSourceByUniqueId = async (depositSourceUniqueId) => {
  const sql = `SELECT * FROM DepositSource WHERE depositSourceUniqueId = ?`;
  const [result] = await pool.query(sql, [depositSourceUniqueId]);

  if (result.length === 0) {
    throw new AppError("Deposit source not found", 404);
  }

  return { message: "success", data: result[0] };
};

// Update by UUID
const updateDepositSourceByUniqueId = async (
  depositSourceUniqueId,
  data,
  user,
) => {
  const userUniqueId = user?.userUniqueId;
  const setParts = [];
  const values = [];

  // Build dynamic SET clause based on provided fields
  if (data.sourceKey !== undefined) {
    setParts.push("sourceKey = ?");
    values.push(data.sourceKey);
  }
  if (data.sourceLabel !== undefined) {
    setParts.push("sourceLabel = ?");
    values.push(data.sourceLabel);
  }

  // Check if any fields were provided to update
  if (setParts.length === 0) {
    throw new AppError("No fields provided to update", 400);
  }

  // Always update audit fields
  setParts.push("depositSourceUpdatedBy = ?");
  values.push(userUniqueId);
  setParts.push("depositSourceUpdatedAt = ?");
  values.push(currentDate());

  values.push(depositSourceUniqueId);
  const sql = `UPDATE DepositSource SET ${setParts.join(", ")} WHERE depositSourceUniqueId = ? AND depositSourceDeletedAt IS NULL`;

  const [result] = await pool.query(sql, values);

  if (result.affectedRows === 0) {
    throw new AppError("Failed to update deposit source", 500);
  }

  return {
    message: "success",
    data: { depositSourceUniqueId, ...data },
  };
};

// Delete by UUID
const deleteDepositSourceByUniqueId = async (depositSourceUniqueId, user) => {
  // first check if it was deleted before
  const checkDeletedSql = `SELECT depositSourceDeletedAt FROM DepositSource WHERE depositSourceUniqueId = ?`;
  const [existing] = await pool.query(checkDeletedSql, [depositSourceUniqueId]);

  if (existing.length === 0) {
    throw new AppError("Deposit source not found", 404);
  }

  if (existing[0].depositSourceDeletedAt) {
    throw new AppError("Deposit source is already deleted", 400);
  }

  const userUniqueId = user?.userUniqueId;
  const sql = `UPDATE DepositSource SET depositSourceDeletedAt = ?, depositSourceDeletedBy = ? WHERE depositSourceUniqueId = ?`;
  const [result] = await pool.query(sql, [
    currentDate(),
    userUniqueId,
    depositSourceUniqueId,
  ]);

  if (result.affectedRows === 0) {
    throw new AppError("Failed to delete deposit source", 500);
  }

  return { message: "success", data: `Deleted: ${depositSourceUniqueId}` };
};

module.exports = {
  createDepositSource,
  getAllDepositSources,
  getDepositSourceByUniqueId,
  updateDepositSourceByUniqueId,
  deleteDepositSourceByUniqueId,
};
