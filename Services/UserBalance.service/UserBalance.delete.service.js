const { pool } = require("../../Middleware/Database.config");
const AppError = require("../../Utils/AppError");

// Delete a driver balance record by ID
const deleteUserBalance = async (userBalanceUniqueId) => {
  const sql = `DELETE FROM UserBalance WHERE userBalanceUniqueId = ?`;
  const [result] = await pool.query(sql, [userBalanceUniqueId]);
  if (result.affectedRows === 0) {
    throw new AppError("Driver balance not found", 404);
  }

  return "Balance record deleted successfully";
};
const deleteUserBalanceByTransactionUniqueId = async ({
  transactionUniqueId,
}) => {
  const sql = `DELETE FROM UserBalance WHERE transactionUniqueId = ?`;
  const [result] = await pool.query(sql, [transactionUniqueId]);

  if (result.affectedRows === 0) {
    throw new AppError("Driver balance not found", 404);
  }
  return "Balance record deleted successfully";
};

module.exports = {
  deleteUserBalance,
  deleteUserBalanceByTransactionUniqueId,
};
