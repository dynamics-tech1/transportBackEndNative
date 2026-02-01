const { v4: uuidv4 } = require("uuid");
const { currentDate } = require("../Utils/CurrentDate");
const { pool } = require("../Middleware/Database.config");
const { getData } = require("../CRUD/Read/ReadData");
const AppError = require("../Utils/AppError");

// Create a new tariff rate
exports.createTariffRate = async (data) => {
  const {
    tariffRateName,
    standingTariffRate,
    journeyTariffRate,
    timingTariffRate,
    tariffRateDescription,
    tariffRateEffectiveDate,
    tariffRateExpirationDate,
  } = data;
  // validate if all  tariff rate exists
  if (
    !tariffRateName ||
    !standingTariffRate ||
    !journeyTariffRate ||
    !timingTariffRate
  ) {
    throw new AppError(
      "Tariff rate name and all tariff rates are required",
      400,
    );
  }
  const existedTariffRate = await getData({
    tableName: "TariffRate",
    conditions: { tariffRateName },
  });
  if (existedTariffRate?.length > 0) {
    throw new AppError("Tariff rate already exists", 400);
  }
  const sql = `
    INSERT INTO TariffRate (
      tariffRateUniqueId,
      tariffRateName,
      standingTariffRate,
      journeyTariffRate,
      timingTariffRate,
      tariffRateEffectiveDate,
      tariffRateExpirationDate,
      tariffRateDescription,
      tariffRateCreatedBy,
      tariffRateCreatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const user = data.user;
  const userUniqueId = user.userUniqueId;
  const values = [
    uuidv4(),
    tariffRateName,
    standingTariffRate,
    journeyTariffRate,
    timingTariffRate,
    tariffRateEffectiveDate,
    tariffRateExpirationDate,
    tariffRateDescription,
    userUniqueId,
    currentDate(),
  ];
  await pool.query(sql, values);
  return { message: "success", data: "Tariff rate created successfully" };
};

// Get all tariff rates
exports.getAllTariffRates = async () => {
  const sql = `SELECT * FROM TariffRate`;
  const [result] = await pool.query(sql);
  return { message: "success", data: result };
};

// Get a tariff rate by ID
exports.getTariffRateById = async (tariffRateUniqueId) => {
  const sql = `SELECT * FROM TariffRate WHERE tariffRateUniqueId = ?`;
  const [result] = await pool.query(sql, [tariffRateUniqueId]);
  if (!result[0]) {
    throw new AppError("Tariff rate not found", 404);
  }
  return { message: "success", data: result[0] };
};

// Update a tariff rate by ID
exports.updateTariffRate = async (tariffRateUniqueId, data) => {
  const userUniqueId = data.user?.userUniqueId;
  const setParts = [];
  const values = [];

  // Build dynamic SET clause based on provided fields
  if (data.tariffRateName !== undefined) {
    setParts.push("tariffRateName = ?");
    values.push(data.tariffRateName);
  }
  if (data.standingTariffRate !== undefined) {
    setParts.push("standingTariffRate = ?");
    values.push(data.standingTariffRate);
  }
  if (data.journeyTariffRate !== undefined) {
    setParts.push("journeyTariffRate = ?");
    values.push(data.journeyTariffRate);
  }
  if (data.timingTariffRate !== undefined) {
    setParts.push("timingTariffRate = ?");
    values.push(data.timingTariffRate);
  }
  if (data.tariffRateEffectiveDate !== undefined) {
    setParts.push("tariffRateEffectiveDate = ?");
    values.push(data.tariffRateEffectiveDate);
  }
  if (data.tariffRateExpirationDate !== undefined) {
    setParts.push("tariffRateExpirationDate = ?");
    values.push(data.tariffRateExpirationDate);
  }
  if (data.tariffRateDescription !== undefined) {
    setParts.push("tariffRateDescription = ?");
    values.push(data.tariffRateDescription);
  }

  // Check if any fields were provided to update
  if (setParts.length === 0) {
    throw new AppError("No fields provided to update", 400);
  }

  // Always update audit fields
  setParts.push("tariffRateUpdatedBy = ?");
  values.push(userUniqueId);
  setParts.push("tariffRateUpdatedAt = ?");
  values.push(currentDate());

  values.push(tariffRateUniqueId);
  const sql = `UPDATE TariffRate SET ${setParts.join(", ")} WHERE tariffRateUniqueId = ? AND tariffRateDeletedAt IS NULL`;

  const [result] = await pool.query(sql, values);
  if (result.affectedRows === 0) {
    throw new AppError("Tariff rate not found or update failed", 404);
  }
  return { message: "success", data: "Tariff rate updated successfully" };
};

// Delete a tariff rate by ID
exports.deleteTariffRate = async (id, user) => {
  const userUniqueId = user?.userUniqueId;
  const sql = `UPDATE TariffRate SET tariffRateDeletedAt = ?, tariffRateDeletedBy = ? WHERE tariffRateId = ?`;
  const [result] = await pool.query(sql, [currentDate(), userUniqueId, id]);
  if (result.affectedRows === 0) {
    throw new AppError("Tariff rate not found or delete failed", 404);
  }
  return { message: "success", data: "Tariff rate deleted successfully" };
};
