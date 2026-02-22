const { v4: uuidv4 } = require("uuid");
const { currentDate } = require("../Utils/CurrentDate");
const { getData } = require("../CRUD/Read/ReadData");
const { insertData } = require("../CRUD/Create/CreateData");
const { updateData } = require("../CRUD/Update/Data.update");
const { createVehicleOwnership } = require("./VehicleOwnership.service");
const { createVehicleStatus } = require("./VehicleStatus.service");
const { removeWhiteSpace } = require("../Validator/Validation");
const { createVehicleDriver } = require("./VehicleDriver.service");
const { usersRoles } = require("../Utils/ListOfSeedData");
const { pool } = require("../Middleware/Database.config");
const AppError = require("../Utils/AppError");

// create vehicle and create ownership based on status of vehicle.
const createVehicle = async (data, user, driverUserUniqueId) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    let vehicleTypeUniqueId = data?.vehicleTypeUniqueId,
      licensePlate = data?.licensePlate,
      color = data?.color;

    licensePlate = removeWhiteSpace(licensePlate);
    if (!vehicleTypeUniqueId || !licensePlate || !color) {
      throw new AppError("All fields are required", 400);
    }

    // Verify if VehicleType exists
    const vehicleTypeExists = await getData({
      tableName: "VehicleTypes",
      conditions: { vehicleTypeUniqueId },
      connection,
    });

    if (!vehicleTypeExists.length) {
      throw new AppError("Vehicle type does not exist", 400);
    }

    // Check if vehicle with the same license plate exists
    let vehicle = await getData({
      tableName: "Vehicle",
      conditions: { licensePlate },
      connection,
    });

    if (!vehicle?.length) {
      // Vehicle doesn't exist, create it
      const vehicleUniqueId = uuidv4();
      await insertData({
        tableName: "Vehicle",
        colAndVal: {
          vehicleUniqueId,
          vehicleTypeUniqueId,
          licensePlate,
          color,
          vehicleCreatedBy: user?.userUniqueId,
          vehicleCreatedAt: currentDate(),
        },
        connection,
      });

      // Register vehicle status as Active (VehicleStatusTypeId = 1)
      await createVehicleStatus({
        vehicleUniqueId,
        VehicleStatusTypeId: 1,
        vehicleStatusCreatedBy: user?.userUniqueId,
        connection,
      });

      vehicle = [{ vehicleUniqueId }];
    }

    // check if this user has active vehicle
    // Note: getVehicleDrivers currently reads from pooled connection implicitly if checking other drivers?
    // Wait, getVehicleDrivers is complex read. For consistency, let's just check simplified using `getData` or ensure `getVehicleDrivers` supports connection if we modify it.
    // Looking at previous step, `createVehicleDriver` was updated, but `getVehicleDrivers` (read) was NOT updated to accept connection.
    // However, `getVehicleDrivers` just does a read. For strict serializable isolation, we should use the connection.
    // For now, let's use the standard `getData` which SUPPORTS connection to check for active assignment for THIS user.
    // or rely on `getVehicleDrivers` if we updated it.. I did NOT update `getVehicleDrivers` in the plan, only `createVehicleDriver`.
    // Let's use `getData` here for safety and consistency within transaction.

    // Check active assignment for this driver
    const activeAssignments = await getData({
      tableName: "VehicleDriver",
      conditions: {
        driverUserUniqueId,
        assignmentStatus: "active",
      },
      connection,
    });

    if (activeAssignments?.length > 0) {
      throw new AppError("Driver already has an active vehicle", 400);
    }

    const vehicleUniqueId = vehicle?.[0]?.vehicleUniqueId;

    // Create vehicle ownership record
    await createVehicleOwnership({
      vehicleUniqueId,
      userUniqueId: driverUserUniqueId,
      roleId: usersRoles.vehicleOwnerRoleId,
      ownershipStartDate: currentDate(),
      vehicleOwnershipCreatedBy: user?.userUniqueId,
      connection,
    });

    // Assign driver to vehicle
    await createVehicleDriver({
      vehicleUniqueId,
      driverUserUniqueId: driverUserUniqueId,
      assignmentStartDate: currentDate(),
      assignmentStatus: "active",
      vehicleDriverCreatedBy: user?.userUniqueId,
      connection,
    });

    await connection.commit();
    return { message: "success", data: { vehicleUniqueId } };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateVehicle = async (vehicleUniqueId, updateValues) => {
  const result = await updateData({
    tableName: "Vehicle",
    conditions: { vehicleUniqueId },
    updateValues,
  });

  if (result.affectedRows === 0) {
    throw new AppError("Failed to update vehicle or vehicle not found", 404);
  }

  return { message: "success", data: "Vehicle updated successfully" };
};

const deleteVehicle = async (vehicleUniqueId) => {
  // Soft delete or deactivating vehicle
  const result = await updateData({
    tableName: "Vehicle",
    conditions: { vehicleUniqueId },
    updateValues: { vehicleDeletedAt: currentDate() },
  });

  if (result.affectedRows === 0) {
    throw new AppError("Failed to delete vehicle or vehicle not found", 404);
  }

  return { message: "success", data: "Vehicle deleted successfully" };
};

const getVehicles = async (query) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "vehicleCreatedAt",
    sortOrder = "DESC",
    vehicleUniqueId,
    ownerUserUniqueId,
    licensePlate,
    color,
    vehicleTypeUniqueId,
    search,
  } = query;

  const offset = (page - 1) * limit;
  let whereConditions = ["v.vehicleDeletedAt IS NULL"];
  const params = [];

  if (vehicleUniqueId) {
    whereConditions.push("v.vehicleUniqueId = ?");
    params.push(vehicleUniqueId);
  }

  if (ownerUserUniqueId) {
    whereConditions.push("vo.userUniqueId = ?");
    params.push(ownerUserUniqueId);
  }

  if (licensePlate) {
    whereConditions.push("v.licensePlate LIKE ?");
    params.push(`%${licensePlate}%`);
  }

  if (color) {
    whereConditions.push("v.color = ?");
    params.push(color);
  }

  if (vehicleTypeUniqueId) {
    whereConditions.push("v.vehicleTypeUniqueId = ?");
    params.push(vehicleTypeUniqueId);
  }

  if (search) {
    whereConditions.push("(v.licensePlate LIKE ? OR v.color LIKE ?)");
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
  }

  const whereClause = whereConditions.length
    ? `WHERE ${whereConditions.join(" AND ")}`
    : "";

  const sql = `
    SELECT 
      v.*,
      vt.vehicleTypeName,
      vt.vehicleTypeDescription,
      MAX(vo.userUniqueId) as ownerUniqueId,
      MAX(vs.VehicleStatusTypeId) as VehicleStatusTypeId
    FROM Vehicle v
    LEFT JOIN VehicleTypes vt ON v.vehicleTypeUniqueId = vt.vehicleTypeUniqueId
    LEFT JOIN VehicleOwnership vo ON v.vehicleUniqueId = vo.vehicleUniqueId AND vo.ownershipEndDate IS NULL
    LEFT JOIN VehicleStatus vs ON v.vehicleUniqueId = vs.vehicleUniqueId AND vs.statusEndDate IS NULL
    ${whereClause}
    GROUP BY v.vehicleId
    ORDER BY v.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT v.vehicleUniqueId) as total
    FROM Vehicle v
    LEFT JOIN VehicleOwnership vo ON v.vehicleUniqueId = vo.vehicleUniqueId AND vo.ownershipEndDate IS NULL
    ${whereClause}
  `;

  const [rows] = await pool.query(sql, [...params, parseInt(limit), offset]);
  const [totalRows] = await pool.query(countSql, params);

  const totalItems = totalRows[0].total;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    message: "success",
    data: rows,
    pagination: {
      totalItems,
      totalPages,
      currentPage: parseInt(page),
      itemsPerPage: parseInt(limit),
    },
  };
};

module.exports = {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicles,
};
