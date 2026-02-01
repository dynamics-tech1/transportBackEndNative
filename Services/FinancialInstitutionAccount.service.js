const { pool } = require("../Middleware/Database.config");
const { v4: uuidv4 } = require("uuid");
const { currentDate } = require("../Utils/CurrentDate");
const AppError = require("../Utils/AppError");

// Create
const createFinancialInstitutionAccount = async (data) => {
  const {
    institutionName,
    accountHolderName,
    accountNumber,
    accountType = "bank",
    isActive = true,
    addedBy,
    user,
  } = data;

  // Check existence
  const checkSql = `SELECT count(*) as count FROM FinancialInstitutionAccounts WHERE institutionName = ? AND accountNumber = ?`;
  const [checkResult] = await pool.query(checkSql, [
    institutionName,
    accountNumber,
  ]);

  if (checkResult[0].count > 0) {
    throw new AppError(
      "Account already exists with this institution and account number",
      400,
    );
  }

  const accountUniqueId = uuidv4();
  const createdBy = user?.userUniqueId || accountUniqueId;

  const sql = `
      INSERT INTO FinancialInstitutionAccounts (
        accountUniqueId, institutionName, accountHolderName,
        accountNumber, accountType, isActive, addedBy, financialInstitutionAccountsCreatedBy, financialInstitutionAccountsCreatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  await pool.query(sql, [
    accountUniqueId,
    institutionName,
    accountHolderName,
    accountNumber,
    accountType,
    isActive,
    addedBy || createdBy,
    createdBy,
    currentDate(),
  ]);

  return {
    message: "success",
    data: "Financial institution account created successfully",
  };
};

// Unified Get with filter and pagination
const getFinancialInstitutionAccounts = async (filters = {}) => {
  const {
    accountUniqueId,
    institutionName,
    accountHolderName,
    isActive,
    page = 1,
    pageSize = 10,
  } = filters;

  let sql = `SELECT * FROM FinancialInstitutionAccounts WHERE 1=1`;
  const params = [];

  if (accountUniqueId) {
    sql += ` AND accountUniqueId = ?`;
    params.push(accountUniqueId);
  }

  if (institutionName) {
    sql += ` AND institutionName LIKE ?`;
    params.push(`%${institutionName}%`);
  }

  if (accountHolderName) {
    sql += ` AND accountHolderName LIKE ?`;
    params.push(`%${accountHolderName}%`);
  }

  if (isActive !== undefined) {
    sql += ` AND isActive = ?`;
    params.push(isActive === "true" || isActive === true ? 1 : 0);
  }

  // Count total for pagination
  const countSql = `SELECT COUNT(*) as total FROM (${sql}) as subquery`;
  const [countResult] = await pool.query(countSql, params);
  const total = countResult[0].total;

  // Pagination
  const offset = (page - 1) * pageSize;
  sql += ` ORDER BY financialInstitutionAccountsCreatedAt DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(pageSize), parseInt(offset));

  const [result] = await pool.query(sql, params);

  return {
    message: "success",
    data: result,
    pagination: {
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// Update
const updateFinancialInstitutionAccountByUniqueId = async (
  accountUniqueId,
  updates,
) => {
  const setParts = [];
  const values = [];

  // Build dynamic SET clause based on provided fields
  if (updates.institutionName !== undefined) {
    setParts.push("institutionName = ?");
    values.push(updates.institutionName);
  }
  if (updates.accountHolderName !== undefined) {
    setParts.push("accountHolderName = ?");
    values.push(updates.accountHolderName);
  }
  if (updates.accountNumber !== undefined) {
    setParts.push("accountNumber = ?");
    values.push(updates.accountNumber);
  }
  if (updates.accountType !== undefined) {
    setParts.push("accountType = ?");
    values.push(updates.accountType);
  }
  if (updates.isActive !== undefined) {
    setParts.push("isActive = ?");
    values.push(updates.isActive);
  }
  if (updates.addedBy !== undefined) {
    setParts.push("addedBy = ?");
    values.push(updates.addedBy);
  }

  // Check if any fields were provided to update
  if (setParts.length === 0) {
    throw new AppError("No fields provided to update", 400);
  }

  // Always update audit fields
  setParts.push("financialInstitutionAccountUpdatedBy = ?");
  values.push(updates.addedBy); // Use the same user for updatedBy
  setParts.push("financialInstitutionAccountsUpdatedAt = ?");
  values.push(currentDate());

  values.push(accountUniqueId);
  const sql = `UPDATE FinancialInstitutionAccounts SET ${setParts.join(", ")} WHERE accountUniqueId = ? AND financialInstitutionAccountDeletedAt IS NULL`;

  const [result] = await pool.query(sql, values);

  if (result.affectedRows === 0) {
    throw new AppError("Update failed or account not found", 404);
  }

  return { message: "success", data: { accountUniqueId, ...updates } };
};

// Delete
const deleteFinancialInstitutionAccountByUniqueId = async (accountUniqueId) => {
  const sql = `DELETE FROM FinancialInstitutionAccounts WHERE accountUniqueId = ?`;
  const [result] = await pool.query(sql, [accountUniqueId]);

  if (result.affectedRows === 0) {
    throw new AppError("Deletion failed or account not found", 404);
  }

  return { message: "success", data: `Deleted: ${accountUniqueId}` };
};

module.exports = {
  createFinancialInstitutionAccount,
  getFinancialInstitutionAccounts,
  updateFinancialInstitutionAccountByUniqueId,
  deleteFinancialInstitutionAccountByUniqueId,
};
