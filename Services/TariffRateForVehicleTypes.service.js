const { v4: uuidv4 } = require("uuid");
const { pool } = require("../Middleware/Database.config");
const { getData, performJoinSelect } = require("../CRUD/Read/ReadData");
const AppError = require("../Utils/AppError");

// Create a new tariff rate for a vehicle type
exports.createTariffRateForVehicleType = async (data) => {
  // verify existence of data
  const existedData = await getData({
    tableName: "TariffRateForVehicleTypes",
    conditions: {
      vehicleTypeUniqueId: data.vehicleTypeUniqueId,
      tariffRateUniqueId: data.tariffRateUniqueId,
    },
  });

  if (existedData.length > 0) {
    throw new AppError("Tariff rate for vehicle type already exists", 400);
  }
  const sql = `
    INSERT INTO TariffRateForVehicleTypes (
      tariffRateForVehicleTypeUniqueId,
      vehicleTypeUniqueId,
      tariffRateUniqueId 
    ) VALUES (?, ?, ?)
  `;
  const values = [uuidv4(), data.vehicleTypeUniqueId, data.tariffRateUniqueId];
  await pool.query(sql, values);

  return {
    message: "success",
    data: "Tariff rate for vehicle type created successfully",
  };
};

// Get all tariff rates for vehicle types
exports.getAllTariffRatesForVehicleTypes = async () => {
  const result = await performJoinSelect({
    baseTable: "TariffRateForVehicleTypes",
    joins: [
      {
        table: "VehicleTypes",
        on: "TariffRateForVehicleTypes.vehicleTypeUniqueId = VehicleTypes.vehicleTypeUniqueId",
      },
      {
        table: "TariffRate",
        on: "TariffRateForVehicleTypes.tariffRateUniqueId = TariffRate.tariffRateUniqueId",
      },
    ],
  });

  return {
    message: "success",
    data: result || [],
  };
};

// get tariff rate by vehicle type unique id
exports.getTariffRateByVehicleTypeUniqueId = async (vehicleTypeUniqueId) => {
  const result = await performJoinSelect({
    baseTable: "TariffRateForVehicleTypes",
    joins: [
      {
        table: "TariffRate",
        on: "TariffRateForVehicleTypes.tariffRateUniqueId = TariffRate.tariffRateUniqueId",
      },
    ],
    conditions: {
      vehicleTypeUniqueId: vehicleTypeUniqueId,
    },
  });

  return {
    message: "success",
    data: result || [],
  };
};

// Get a tariff rate for vehicle type by ID
exports.getTariffRateForVehicleTypeById = async (
  tariffRateForVehicleTypeId,
) => {
  const result = await performJoinSelect({
    baseTable: "TariffRateForVehicleTypes",
    joins: [
      {
        table: "VehicleTypes",
        on: "TariffRateForVehicleTypes.vehicleTypeUniqueId = VehicleTypes.vehicleTypeUniqueId",
      },
      {
        table: "TariffRate",
        on: "TariffRateForVehicleTypes.tariffRateUniqueId = TariffRate.tariffRateUniqueId",
      },
    ],
    conditions: {
      tariffRateForVehicleTypeId: tariffRateForVehicleTypeId,
    },
  });

  if (!result || result.length === 0) {
    throw new AppError("Tariff rate for vehicle type not found", 404);
  }

  return { message: "success", data: result[0] };
};

// Update a tariff rate for vehicle type by ID
exports.updateTariffRateForVehicleType = async (
  tariffRateForVehicleTypeUniqueId,
  data,
) => {
  const sql = `
    UPDATE TariffRateForVehicleTypes
    SET vehicleTypeUniqueId = ?, tariffRateUniqueId = ?
    WHERE tariffRateForVehicleTypeUniqueId = ?
  `;
  const values = [
    data.vehicleTypeUniqueId,
    data.tariffRateUniqueId,
    tariffRateForVehicleTypeUniqueId,
  ];

  const [result] = await pool.query(sql, values);

  if (result.affectedRows === 0) {
    throw new AppError(
      "Tariff rate for vehicle type not found or no changes made",
      404,
    );
  }

  return {
    message: "success",
    data: "Tariff rate for vehicle type updated successfully",
  };
};

// Delete a tariff rate for vehicle type by ID
exports.deleteTariffRateForVehicleType = async (
  tariffRateForVehicleTypeUniqueId,
) => {
  const sql = `DELETE FROM TariffRateForVehicleTypes WHERE tariffRateForVehicleTypeUniqueId = ?`;
  const [result] = await pool.query(sql, [tariffRateForVehicleTypeUniqueId]);

  if (result.affectedRows === 0) {
    throw new AppError("Tariff rate for vehicle type not found", 404);
  }

  return {
    message: "success",
    data: "Tariff rate for vehicle type deleted successfully",
  };
};
