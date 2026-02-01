const { getData } = require("../CRUD/Read/ReadData");
const { pool } = require("../Middleware/Database.config");
const { v4: uuidv4 } = require("uuid");
const { currentDate } = require("../Utils/CurrentDate");
const AppError = require("../Utils/AppError");
const logger = require("../Utils/logger");

// Create a new VehicleDriver assignment
const createVehicleDriver = async (data) => {
  const {
    vehicleUniqueId,
    driverUserUniqueId,
    assignmentStatus = "active",
    assignmentStartDate,
    assignmentEndDate = null,
    vehicleDriverCreatedBy,
    connection = null, // Optional connection for transaction
  } = data || {};

  // Basic validation
  if (!vehicleUniqueId || !driverUserUniqueId || !assignmentStartDate) {
    throw new AppError("Missing required fields", 400);
  }
  // validate assignmentStatus
  const allowedStatuses = ["active", "inactive"];
  if (!allowedStatuses.includes(assignmentStatus)) {
    throw new AppError("Invalid assignmentStatus", 400);
  }
  // first check if this vehicle is reserved by another user driver

  const vehicleDriver = await getData({
    tableName: "VehicleDriver",
    conditions: { vehicleUniqueId, assignmentStatus: "active" },
    connection,
  });
  // if vehicle is reserved by current user driver
  for (let data of vehicleDriver) {
    if (
      data.driverUserUniqueId === driverUserUniqueId &&
      data.assignmentStatus === "active"
    ) {
      throw new AppError("Vehicle is already reserved by you", 400);
    }
  }
  // if vehicle is reserved by another user driver
  if (vehicleDriver.length) {
    throw new AppError("Vehicle is already reserved by another user", 400);
  }

  const vehicleDriverUniqueId = uuidv4();
  const sql = `
    INSERT INTO VehicleDriver (
      vehicleDriverUniqueId,
      vehicleUniqueId,
      driverUserUniqueId,
      assignmentStatus,
      assignmentStartDate,
      assignmentEndDate,
      vehicleDriverCreatedBy,
      vehicleDriverCreatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const queryExecutor = connection || pool;
  const [result] = await queryExecutor.query(sql, [
    vehicleDriverUniqueId,
    vehicleUniqueId,
    driverUserUniqueId,
    assignmentStatus,
    assignmentStartDate,
    assignmentEndDate,
    vehicleDriverCreatedBy,
    currentDate(),
  ]);

  if (!result.affectedRows) {
    throw new AppError("Insert failed", 500);
  }

  return { message: "success", data: { vehicleDriverUniqueId } };
};

// Consolidated, secure, paginated GET
const getVehicleDrivers = async (filters = {}) => {
  const {
    vehicleDriverUniqueId,
    vehicleUniqueId,
    driverUserUniqueId,
    assignmentStatus,
    assignmentStartStart, // range for assignmentStartDate
    assignmentStartEnd,
    assignmentEndStart, // range for assignmentEndDate
    assignmentEndEnd,
    createdStart,
    createdEnd,
    updatedStart,
    updatedEnd,
    page = 1,
    limit = 10,
    sortBy = "vehicleDriverCreatedAt",
    sortOrder = "DESC",
  } = filters;
  const where = [];
  const params = [];

  if (vehicleDriverUniqueId) {
    where.push("vd.vehicleDriverUniqueId = ?");
    params.push(vehicleDriverUniqueId);
  }
  if (vehicleUniqueId) {
    where.push("vd.vehicleUniqueId = ?");
    params.push(vehicleUniqueId);
  }

  if (driverUserUniqueId) {
    where.push("vd.driverUserUniqueId = ?");
    params.push(driverUserUniqueId);
  }
  if (assignmentStatus) {
    const allowed = ["active", "inactive"];
    if (!allowed.includes(assignmentStatus)) {
      throw new AppError("Invalid assignmentStatus", 400);
    }
    where.push("vd.assignmentStatus = ?");
    params.push(assignmentStatus);
  }
  if (assignmentStartStart) {
    where.push("vd.assignmentStartDate >= ?");
    params.push(assignmentStartStart);
  }
  if (assignmentStartEnd) {
    where.push("vd.assignmentStartDate <= ?");
    params.push(assignmentStartEnd);
  }
  if (assignmentEndStart) {
    where.push("vd.assignmentEndDate >= ?");
    params.push(assignmentEndStart);
  }
  if (assignmentEndEnd) {
    where.push("vd.assignmentEndDate <= ?");
    params.push(assignmentEndEnd);
  }
  if (createdStart) {
    where.push("vd.vehicleDriverCreatedAt >= ?");
    params.push(createdStart);
  }
  if (createdEnd) {
    where.push("vd.vehicleDriverCreatedAt <= ?");
    params.push(createdEnd);
  }
  if (updatedStart) {
    where.push("vd.vehicleDriverUpdatedAt >= ?");
    params.push(updatedStart);
  }
  if (updatedEnd) {
    where.push("vd.vehicleDriverUpdatedAt <= ?");
    params.push(updatedEnd);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const numPage = Math.max(1, Number(page) || 1);
  const numLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
  const offset = (numPage - 1) * numLimit;

  const sortableMap = {
    createdAt: "vd.vehicleDriverCreatedAt",
    updatedAt: "vd.vehicleDriverUpdatedAt",
    assignmentStartDate: "vd.assignmentStartDate",
    assignmentEndDate: "vd.assignmentEndDate",
  };
  const safeSortBy = sortableMap[sortBy] || "vd.vehicleDriverCreatedAt";
  const safeSortOrder =
    String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const sql = `
    SELECT 
      vd.*, 
      v.vehicleTypeUniqueId, v.licensePlate, v.color,
      vt.*
    FROM VehicleDriver vd
    LEFT JOIN   Vehicle v ON vd.vehicleUniqueId = v.vehicleUniqueId
    LEFT JOIN VehicleTypes vt ON v.   vehicleTypeUniqueId = vt.vehicleTypeUniqueId
    LEFT JOIN Users dr ON vd.driverUserUniqueId = dr.userUniqueId
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  const countSql = `
    SELECT COUNT(*) as total
    FROM VehicleDriver vd
     ${whereClause}
  `;

  const [rows] = await pool.query(sql, [...params, numLimit, offset]);
  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0]?.total || 0;
  const totalPages = Math.ceil(total / numLimit);

  return {
    message: "success",
    data: rows,
    pagination: {
      currentPage: numPage,
      itemsPerPage: numLimit,
      totalItems: total,
      totalPages,
      hasNext: numPage < totalPages,
      hasPrev: numPage > 1,
    },
  };
};

// Update assignment
const updateVehicleDriverByUniqueId = async (
  vehicleDriverUniqueId,
  data = {},
) => {
  if (!vehicleDriverUniqueId) {
    throw new AppError("Missing ID", 400);
  }

  const fields = [];
  const params = [];
  const allowedStatuses = ["active", "inactive"];

  if (data.vehicleUniqueId) {
    fields.push("vehicleUniqueId = ?");
    params.push(data.vehicleUniqueId);
  }
  if (data.ownerUserUniqueId) {
    fields.push("ownerUserUniqueId = ?");
    params.push(data.ownerUserUniqueId);
  }
  if (data.driverUserUniqueId) {
    fields.push("driverUserUniqueId = ?");
    params.push(data.driverUserUniqueId);
  }
  if (data.assignmentStatus) {
    if (!allowedStatuses.includes(data.assignmentStatus)) {
      throw new AppError("Invalid assignmentStatus", 400);
    }
    fields.push("assignmentStatus = ?");
    params.push(data.assignmentStatus);
  }
  if (data.assignmentStartDate) {
    fields.push("assignmentStartDate = ?");
    params.push(data.assignmentStartDate);
  }
  if (typeof data.assignmentEndDate !== "undefined") {
    fields.push("assignmentEndDate = ?");
    params.push(data.assignmentEndDate);
  }

  if (!fields.length) {
    throw new AppError("No fields to update", 400);
  }

  const sql = `UPDATE VehicleDriver SET ${fields.join(
    ", ",
  )}, vehicleDriverUpdatedAt = ? WHERE vehicleDriverUniqueId = ?`;
  params.push(currentDate(), vehicleDriverUniqueId);

  const [result] = await pool.query(sql, params);
  if (!result.affectedRows) {
    throw new AppError("Update failed or assignment not found", 404);
  }
  return { message: "success", data: { updated: true } };
};

// Delete assignment
const deleteVehicleDriverByUniqueId = async (vehicleDriverUniqueId) => {
  if (!vehicleDriverUniqueId) {
    throw new AppError("Missing ID", 400);
  }

  const [result] = await pool.query(
    `DELETE FROM VehicleDriver WHERE vehicleDriverUniqueId = ?`,
    [vehicleDriverUniqueId],
  );
  if (!result.affectedRows) {
    throw new AppError("Delete failed or assignment not found", 404);
  }
  return { message: "success", data: { deleted: true } };
};

module.exports = {
  createVehicleDriver,
  getVehicleDrivers,
  updateVehicleDriverByUniqueId,
  deleteVehicleDriverByUniqueId,
};
