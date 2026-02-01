const { insertData } = require("../CRUD/Create/CreateData");
const deleteData = require("../CRUD/Delete/DeleteData");
const { getData } = require("../CRUD/Read/ReadData");
const { updateData } = require("../CRUD/Update/Data.update");
const { pool } = require("../Middleware/Database.config");
const { v4: uuidv4 } = require("uuid");
const { currentDate } = require("../Utils/CurrentDate");
const AppError = require("../Utils/AppError");

const createVehicleStatus = async (data) => {
  const {
    vehicleUniqueId,
    VehicleStatusTypeId,
    statusEndDate = null,
    vehicleStatusCreatedBy,
    connection = null, // Optional connection for transaction
  } = data;
  if (!vehicleUniqueId || !VehicleStatusTypeId) {
    throw new AppError(
      "VehicleUniqueId and VehicleStatusTypeId are required",
      400,
    );
  }

  // Check if the status already exists
  const existingStatus = await getData({
    tableName: "VehicleStatus",
    conditions: { vehicleUniqueId },
    connection,
  });

  if (existingStatus.length) {
    // throw new AppError("VehicleStatus already exists", 400);
  }

  const vehicleStatusUniqueId = uuidv4();

  // Insert new status
  const result = await insertData({
    tableName: "VehicleStatus",
    colAndVal: {
      vehicleStatusUniqueId,
      vehicleUniqueId,
      VehicleStatusTypeId,
      statusStartDate: currentDate(),
      statusEndDate,
      vehicleStatusCreatedBy,
      vehicleStatusCreatedAt: currentDate(),
    },
    connection,
  });

  return { message: "success", data: result };
};

const getVehicleStatusById = async (id) => {
  const result = await getData({
    tableName: "VehicleStatus",
    conditions: { vehicleStatusId: id },
  });
  if (!result?.length) {
    throw new AppError("VehicleStatus not found", 404);
  }
  return { message: "success", data: result[0] };
};

const updateVehicleStatus = async (id, data) => {
  const result = await updateData({
    tableName: "VehicleStatus",
    conditions: { vehicleStatusId: id },
    updateValues: data,
  });

  if (result.affectedRows === 0) {
    throw new AppError("Update failed or VehicleStatus not found", 404);
  }

  return { message: "success", data: result };
};

const deleteVehicleStatus = async (id) => {
  const result = await deleteData({
    tableName: "VehicleStatus",
    conditions: { vehicleStatusId: id },
  });

  if (result.affectedRows === 0) {
    throw new AppError("Delete failed or VehicleStatus not found", 404);
  }

  return { message: "success", data: "VehicleStatus deleted successfully" };
};

const getStatusOfVehicleByVehicleUniqueId = async (vehicleUniqueId) => {
  if (!vehicleUniqueId) {
    throw new AppError("vehicleUniqueId is required", 400);
  }
  const result = await getData({
    tableName: "VehicleStatus",
    conditions: { vehicleUniqueId },
  });

  return { message: "success", data: result[0] };
};

const getVehicleStatuses = async ({ page = 1, limit = 10, search }) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let where = "";
  const params = [];
  if (search) {
    where = "WHERE LOWER(VehicleStatusTypeName) LIKE ?";
    params.push(`%${search.toLowerCase()}%`);
  }

  const sql = `SELECT VehicleStatusTypeName, VehicleStatusTypeDescription FROM VehicleStatusTypes ${where} LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) as total FROM VehicleStatusTypes ${where}`;

  params.push(limitNum, offset);

  const [[countRow]] = await pool.query(
    countSql,
    where ? params.slice(0, -2) : [],
  );
  const [rows] = await pool.query(sql, params);

  return {
    message: "success",
    data: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: countRow?.total || 0,
      totalPages: Math.ceil((countRow?.total || 0) / limitNum) || 1,
    },
  };
};

module.exports = {
  getStatusOfVehicleByVehicleUniqueId,
  createVehicleStatus,
  getVehicleStatusById,
  updateVehicleStatus,
  deleteVehicleStatus,
  getVehicleStatuses,
};
