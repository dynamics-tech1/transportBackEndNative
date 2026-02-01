const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../Middleware/Database.config");
const { currentDate } = require("../../Utils/CurrentDate");
const AppError = require("../../Utils/AppError");

const getDriverLastBalance = async (driverUniqueId) => {
  const sql = `
    SELECT *
    FROM UserBalance
    WHERE userUniqueId = ?
    ORDER BY transactionTime DESC
    LIMIT 1
  `;
  const [result] = await pool.query(sql, [driverUniqueId]);

  if (result.length === 0) {
    throw new AppError("No balance record found", 404);
  }

  return result[0];
};

// create new balance by adding or deducting amount from current balance
const prepareAndCreateNewBalance = async ({
  amount,
  addOrDeduct,
  driverUniqueId,
  transactionUniqueId,
  transactionType,
  isFree,
  userBalanceCreatedBy,
}) => {
  //  validation to all incoming args
  if (
    !amount ||
    !addOrDeduct ||
    !driverUniqueId ||
    !transactionUniqueId ||
    !transactionType
  ) {
    throw new AppError("All balance inputs are required", 400);
  }

  let netBalance = 0;
  try {
    const currentBalance = await getDriverLastBalance(driverUniqueId);
    netBalance = Number(currentBalance?.netBalance || 0);
  } catch {
    // If no previous balance, netBalance remains 0
  }

  // check if there is enough balance to be deducted before deduct if addOrDeduct is deduct and not free
  if (addOrDeduct === "deduct" && !isFree) {
    if (netBalance < Number(amount) || netBalance === 0) {
      throw new AppError("Insufficient balance", 400);
    }
  }

  const newBalance =
    addOrDeduct === "add"
      ? netBalance + Number(amount)
      : netBalance - Number(amount);

  if (addOrDeduct === "add" && newBalance <= 0 && Number(amount) > 0) {
    throw new AppError("User balance overflow or incorrect addition", 400);
  }

  const newNetBalanceData = {
    userUniqueId: driverUniqueId,
    transactionType,
    transactionUniqueId,
    netBalance: newBalance,
    userBalanceCreatedBy,
  };
  return await createUserBalance(newNetBalanceData);
};

const createUserBalance = async (data) => {
  // Verify existence of data transactionUniqueId in userBalance
  const transactionTime = currentDate();
  const sqlToGetData = `
    SELECT * FROM UserBalance 
    WHERE transactionUniqueId = ? AND transactionType = ?
  `;
  const targetedTransactionType = data?.transactionType;
  const [existingRecords] = await pool.query(sqlToGetData, [
    data.transactionUniqueId,
    targetedTransactionType,
  ]);

  if (targetedTransactionType === "Transfer") {
    if (existingRecords.length >= 2) {
      return existingRecords[0];
    }
  } else if (existingRecords.length > 0) {
    return existingRecords[0];
  }

  const sqlInsert = `
    INSERT INTO UserBalance (
      userBalanceUniqueId, userUniqueId, transactionType, 
      transactionUniqueId, transactionTime, netBalance,
      userBalanceCreatedBy, userBalanceCreatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const userBalanceUniqueId = uuidv4();
  const userUniqueId = data?.userUniqueId;
  const transactionType = data?.transactionType;
  const transactionUniqueId = data?.transactionUniqueId;
  const netBalance = data?.netBalance;
  const userBalanceCreatedBy = data?.userBalanceCreatedBy || userUniqueId;
  const values = [
    userBalanceUniqueId,
    userUniqueId,
    transactionType,
    transactionUniqueId,
    transactionTime,
    netBalance,
    userBalanceCreatedBy,
    currentDate(),
  ];

  await pool.query(sqlInsert, values);

  return {
    userBalanceUniqueId,
    userUniqueId,
    transactionType,
    transactionUniqueId,
    transactionTime,
    netBalance,
  };
};

module.exports = { createUserBalance, prepareAndCreateNewBalance };
