#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * One-time script to apply updateUserDepositByUniqueId refactor and balance connection support.
 * Run from project root: node apply-deposit-refactor.js
 */
const fs = require("fs");
const path = require("path");

const MAIN = path.join(__dirname);

// --- 1. UserBalance.post.service.js: add connection + userBalanceAdjustmentType support
const balancePath = path.join(MAIN, "Services/UserBalance.service/UserBalance.post.service.js");
let balanceCode = fs.readFileSync(balancePath, "utf8");

balanceCode = balanceCode.replace(
  /const getDriverLastBalance = async \(driverUniqueId\) => \{[\s\S]*?const \[result\] = await pool\.query\(sql, \[driverUniqueId\]\);/,
  `const getDriverLastBalance = async (driverUniqueId, connection = null) => {
  const sql = \`
    SELECT *
    FROM UserBalance
    WHERE userUniqueId = ?
    ORDER BY transactionTime DESC
    LIMIT 1
  \`;
  const executor = connection || pool;
  const [result] = await executor.query(sql, [driverUniqueId]);`
);

balanceCode = balanceCode.replace(
  /isFree,\s*userBalanceCreatedBy,\s*\}\) => \{/,
  "isFree,\n  userBalanceCreatedBy,\n  userBalanceAdjustmentType,\n  connection,\n}) => {"
);

balanceCode = balanceCode.replace(
  "const currentBalance = await getDriverLastBalance(driverUniqueId);",
  "const currentBalance = await getDriverLastBalance(driverUniqueId, connection);"
);

balanceCode = balanceCode.replace(
  /const newNetBalanceData = \{\s*userUniqueId: driverUniqueId,[\s\S]*?userBalanceCreatedBy,\s*\};[\s\S]*?return await createUserBalance\(newNetBalanceData\);/,
  `const newNetBalanceData = {
    userUniqueId: driverUniqueId,
    transactionType,
    transactionUniqueId,
    netBalance: newBalance,
    userBalanceCreatedBy,
    userBalanceAdjustmentType: userBalanceAdjustmentType || "creation",
  };
  return await createUserBalance(newNetBalanceData, connection);`
);

balanceCode = balanceCode.replace(
  "const createUserBalance = async (data) => {",
  "const createUserBalance = async (data, connection = null) => {"
);

balanceCode = balanceCode.replace(
  /const targetedTransactionType = data\?\.transactionType;\s*const \[existingRecords\] = await pool\.query\(sqlToGetData,/,
  "const targetedTransactionType = data?.transactionType;\n  const executor = connection || pool;\n  const [existingRecords] = await executor.query(sqlToGetData,"
);

balanceCode = balanceCode.replace(
  /  const \[existingRecords\] = await executor\.query\(sqlToGetData,[\s\S]*?targetedTransactionType,\s*\]\);/,
  `  const [existingRecords] = await executor.query(sqlToGetData, [
    data.transactionUniqueId,
    targetedTransactionType,
  ]);`
);

balanceCode = balanceCode.replace(
  `  const sqlInsert = \`
    INSERT INTO UserBalance (
      userBalanceUniqueId, userUniqueId, transactionType, 
      transactionUniqueId, transactionTime, netBalance,
      userBalanceCreatedBy, userBalanceCreatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  \`;`,
  `  const adjustmentType = data?.userBalanceAdjustmentType || "creation";
  const sqlInsert = \`
    INSERT INTO UserBalance (
      userBalanceUniqueId, userUniqueId, transactionType, 
      transactionUniqueId, transactionTime, netBalance,
      userBalanceAdjustmentType, userBalanceCreatedBy, userBalanceCreatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  \`;`
);

balanceCode = balanceCode.replace(
  /  const values = \[\s*userBalanceUniqueId,[\s\S]*?currentDate\(\),\s*\];\s*await pool\.query\(sqlInsert, values\);/,
  `  const values = [
    userBalanceUniqueId,
    userUniqueId,
    transactionType,
    transactionUniqueId,
    transactionTime,
    netBalance,
    adjustmentType,
    userBalanceCreatedBy,
    currentDate(),
  ];

  await executor.query(sqlInsert, values);`
);

fs.writeFileSync(balancePath, balanceCode);
console.log("Updated UserBalance.post.service.js");

// --- 2. UserDeposit.service.js: refactor updateUserDepositByUniqueId
const depositPath = path.join(MAIN, "Services/UserDeposit.service.js");
let depositCode = fs.readFileSync(depositPath, "utf8");

const oldUpdateFn = `const updateUserDepositByUniqueId = async (userDepositUniqueId, data) => {
  if (!userDepositUniqueId || !data || Object.keys(data).length === 0) {
    throw new AppError("Missing deposit ID or update data", 400);
  }

  // Check if depositStatus is being changed to 'approved', it shows if user need to approve the deposit
  const isApproving = data.depositStatus === "approved";
  const userDepositCreatedOrUpdatedBy = data.userDepositCreatedOrUpdatedBy;
  // Get current deposit data to check status and get amount
  const depositFetch = await getUserDeposit({
    userDepositUniqueId,
    limit: 1,
  });
  const depositData = Array.isArray(depositFetch?.data)
    ? depositFetch?.data?.[0]
    : depositFetch?.data;

  if (!depositData) {
    throw new AppError("Deposit not found", 404);
  }

  const oldDepositAmount = depositData?.depositAmount;
  const driverUniqueId = depositData?.driverUniqueId;
  const depositStatus = depositData?.depositStatus;

  const applyDepositUpdate = async (executor, updateData, uniqueId) => {
    const excludedFields = [
      "userDepositUniqueId",
      "userDepositId",
      "userDepositCreatedBy",
      "userDepositCreatedAt",
    ];
    const allowedFields = Object.keys(updateData).filter(
      (key) => !excludedFields.includes(key),
    );
    if (allowedFields.length === 0) {
      throw new AppError("No valid fields to update", 400);
    }
    const setClause = allowedFields.map((field) => \`\${field} = ?\`).join(", ");
    const values = allowedFields.map((field) => updateData[field]);
    const sql = \`UPDATE UserDeposit SET \${setClause}, userDepositUpdatedAt = ? WHERE userDepositUniqueId = ?\`;
    const [result] = await executor.query(sql, [
      ...values,
      currentDate(),
      uniqueId,
    ]);
    if (result.affectedRows === 0) {
      throw new AppError("Deposit not found or update failed", 404);
    }
    return result;
  };

  //approve the deposit if it was not approved before and current request is to approve it
  if (isApproving && depositStatus !== "approved") {
    // When approving, use new amount from payload if provided so we add balance once with the final amount (avoids add old then deduct old + add new)
    const amountToAdd =
      data.depositAmount != null ? data.depositAmount : oldDepositAmount;
    // Use transaction to ensure atomicity
    await executeInTransaction(async (connection) => {
      // 1. Add balance for approved deposit (single operation with correct amount)
      await prepareAndCreateNewBalance({
        addOrDeduct: "add",
        amount: amountToAdd,
        driverUniqueId,
        transactionType: "Deposit",
        transactionUniqueId: userDepositUniqueId,
        userBalanceCreatedBy: userDepositCreatedOrUpdatedBy,
      });
      // 2. Update deposit with provided data
      await applyDepositUpdate(connection, data, userDepositUniqueId);
    });

    // Fetch updated deposit data after successful transaction
    const updatedDepositFetch = await getUserDeposit({
      userDepositUniqueId,
      limit: 1,
    });
    const updatedData = Array.isArray(updatedDepositFetch?.data)
      ? updatedDepositFetch.data[0]
      : updatedDepositFetch?.data;
    return { message: "success", data: updatedData };
  }

  // Not approving, just do regular update
  await applyDepositUpdate(pool, data, userDepositUniqueId);

  //if depositAmount is changed, update the balance, by deduct the old amount and add the new amount
  const newDepositAmount = data.depositAmount;

  if (newDepositAmount && newDepositAmount !== oldDepositAmount) {
    // Reversal: deduct the old amount (undo original add). Adjustment: add the new amount.
    await prepareAndCreateNewBalance({
      addOrDeduct: "deduct",
      amount: oldDepositAmount,
      driverUniqueId,
      transactionType: "Deposit",
      transactionUniqueId: userDepositUniqueId,
      userBalanceAdjustmentType: "reversal",
      userBalanceCreatedBy: userDepositCreatedOrUpdatedBy,
    });
    await prepareAndCreateNewBalance({
      addOrDeduct: "add",
      amount: newDepositAmount,
      driverUniqueId,
      transactionType: "Deposit",
      transactionUniqueId: userDepositUniqueId,
      userBalanceAdjustmentType: "adjustment",
      userBalanceCreatedBy: userDepositCreatedOrUpdatedBy,
    });
  }

  // Fetch updated deposit data
  const updatedDepositFetch = await getUserDeposit({
    userDepositUniqueId,
    limit: 1,
  });
  const updatedData = Array.isArray(updatedDepositFetch?.data)
    ? updatedDepositFetch.data[0]
    : updatedDepositFetch?.data;
  return { message: "success", data: updatedData };
};`;

const newHelpersAndFn = `/**
 * Fetch a single deposit by its unique ID. Throws if not found.
 */
async function fetchDepositData(userDepositUniqueId) {
  const depositFetch = await getUserDeposit({ userDepositUniqueId, limit: 1 });
  const depositData = Array.isArray(depositFetch?.data)
    ? depositFetch.data[0]
    : depositFetch?.data;
  if (!depositData) {
    throw new AppError("Deposit not found", 404);
  }
  return depositData;
}

/**
 * Extract allowed update fields and build the SET clause. Throws if no updatable fields.
 */
function getUpdateFields(data) {
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
  const setClause = allowedFields.map((field) => \`\${field} = ?\`).join(", ");
  const values = allowedFields.map((field) => data[field]);
  return { setClause, values, allowedFields };
}

const updateUserDepositByUniqueId = async (userDepositUniqueId, data) => {
  if (!userDepositUniqueId || !data || Object.keys(data).length === 0) {
    throw new AppError("Missing deposit ID or update data", 400);
  }
  if (data.depositAmount !== undefined && data.depositAmount < 0) {
    throw new AppError("Deposit amount cannot be negative", 400);
  }

  const depositData = await fetchDepositData(userDepositUniqueId);
  const {
    depositAmount: oldDepositAmount,
    driverUniqueId,
    depositStatus,
  } = depositData;
  const isApproving =
    data.depositStatus === "approved" && depositStatus !== "approved";
  const userDepositCreatedOrUpdatedBy = data.userDepositCreatedOrUpdatedBy;
  const { setClause, values } = getUpdateFields(data);

  return executeInTransaction(async (connection) => {
    logger.info("Updating deposit", {
      userDepositUniqueId,
      oldAmount: oldDepositAmount,
      newAmount: data.depositAmount,
      status: data.depositStatus,
      isApproving,
    });

    const updateSql = \`
      UPDATE UserDeposit
      SET \${setClause}, userDepositUpdatedAt = ?
      WHERE userDepositUniqueId = ?
    \`;
    const [updateResult] = await connection.query(updateSql, [
      ...values,
      currentDate(),
      userDepositUniqueId,
    ]);

    if (updateResult.affectedRows === 0) {
      throw new AppError("Deposit not found or update failed", 404);
    }

    const newDepositAmount = data.depositAmount;

    if (isApproving) {
      const amountToAdd =
        newDepositAmount != null ? newDepositAmount : oldDepositAmount;
      await prepareAndCreateNewBalance({
        addOrDeduct: "add",
        amount: amountToAdd,
        driverUniqueId,
        transactionType: "Deposit",
        transactionUniqueId: userDepositUniqueId,
        userBalanceCreatedBy: userDepositCreatedOrUpdatedBy,
        connection,
      });
    } else if (
      newDepositAmount !== undefined &&
      newDepositAmount !== oldDepositAmount &&
      depositStatus === "approved"
    ) {
      await prepareAndCreateNewBalance({
        addOrDeduct: "deduct",
        amount: oldDepositAmount,
        driverUniqueId,
        transactionType: "Deposit",
        transactionUniqueId: userDepositUniqueId,
        userBalanceAdjustmentType: "reversal",
        userBalanceCreatedBy: userDepositCreatedOrUpdatedBy,
        connection,
      });
      await prepareAndCreateNewBalance({
        addOrDeduct: "add",
        amount: newDepositAmount,
        driverUniqueId,
        transactionType: "Deposit",
        transactionUniqueId: userDepositUniqueId,
        userBalanceAdjustmentType: "adjustment",
        userBalanceCreatedBy: userDepositCreatedOrUpdatedBy,
        connection,
      });
    }

    const updatedData = await fetchDepositData(userDepositUniqueId);
    return { message: "success", data: updatedData };
  });
};`;

if (!depositCode.includes("const updateUserDepositByUniqueId = async (userDepositUniqueId, data) => {")) {
  console.error("Could not find updateUserDepositByUniqueId in UserDeposit.service.js");
  process.exit(1);
}

depositCode = depositCode.replace(oldUpdateFn, newHelpersAndFn);
fs.writeFileSync(depositPath, depositCode);
console.log("Updated UserDeposit.service.js");
console.log("Done. You can delete apply-deposit-refactor.js after verifying.");
process.exit(0);
