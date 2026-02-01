const { pool } = require("../../Middleware/Database.config");
const AppError = require("../../Utils/AppError");

const updateUserBalance = async (userBalanceUniqueId, data) => {
  const sql = `
    UPDATE UserBalance
    SET userUniqueId = ?, transactionType = ?, 
        transactionUniqueId = ?, transactionTime = ?, netBalance = ?
    WHERE userBalanceUniqueId = ?
  `;
  const values = [
    data.userUniqueId,
    data.transactionType,
    data.transactionUniqueId,
    data.transactionTime,
    data.netBalance,
    userBalanceUniqueId,
  ];

  const [result] = await pool.query(sql, values);

  if (result.affectedRows === 0) {
    throw new AppError("Driver balance not found", 404);
  }

  return "Driver balance record updated successfully";
};
module.exports = { updateUserBalance };
