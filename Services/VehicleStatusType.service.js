const { insertData } = require("../CRUD/Create/CreateData");
const deleteData = require("../CRUD/Delete/DeleteData");
const { getData } = require("../CRUD/Read/ReadData");
const { updateData } = require("../CRUD/Update/Data.update");
const { currentDate } = require("../Utils/CurrentDate");
const AppError = require("../Utils/AppError");

// Create a new VehicleStatusType
const createVehicleStatusType = async (data) => {
  const statusTypeName = data.VehicleStatusTypeName;
  if (!statusTypeName) {
    throw new AppError("Vehicle Status Type name is required", 400);
  }
  if (statusTypeName.length > 50) {
    throw new AppError("Vehicle Status Type name is too long", 400);
  }

  const registeredType = await getData({
    tableName: "VehicleStatusTypes",
    conditions: { VehicleStatusTypeName: statusTypeName },
  });

  if (registeredType?.length) {
    throw new AppError("Vehicle Status Type already exists", 400);
  }

  const VehicleStatusTypeCreatedBy = "admin";
  const payload = {
    VehicleStatusTypeName: statusTypeName,
    VehicleStatusTypeDescription: data.statusTypeDescription,
    VehicleStatusTypeCreatedAt: currentDate(),
    VehicleStatusTypeCreatedBy,
  };
  const result = await insertData({
    tableName: "VehicleStatusTypes",
    colAndVal: payload,
  });
  return { message: "success", data: result };
};

// Get all VehicleStatusTypes
const getAllVehicleStatusTypes = async () => {
  const result = await getData({ tableName: "VehicleStatusTypes" });
  return { message: "success", data: result };
};

// Get a single VehicleStatusType by ID
const getVehicleStatusTypeById = async (id) => {
  const result = await getData({
    tableName: "VehicleStatusTypes",
    conditions: { VehicleStatusTypeId: id },
  });
  if (!result?.length) {
    throw new AppError("Vehicle Status Type not found", 404);
  }
  return { message: "success", data: result[0] };
};

// Update VehicleStatusType by ID
const updateVehicleStatusType = async (id, data) => {
  const payload = {
    VehicleStatusTypeName: data.statusTypeName,
    VehicleStatusTypeDescription: data.statusTypeDescription,
  };

  const result = await updateData({
    tableName: "VehicleStatusTypes",
    conditions: { VehicleStatusTypeId: id },
    updateValues: payload,
  });

  if (result.affectedRows === 0) {
    throw new AppError("Update failed or Vehicle Status Type not found", 404);
  }

  return {
    message: "success",
    data: "Vehicle Status Type updated successfully",
  };
};

// Delete VehicleStatusType by ID
const deleteVehicleStatusType = async (id) => {
  const result = await deleteData({
    tableName: "VehicleStatusTypes",
    conditions: { VehicleStatusTypeId: id },
  });

  if (result.affectedRows === 0) {
    throw new AppError("Delete failed or Vehicle Status Type not found", 404);
  }

  return {
    message: "success",
    data: "Vehicle Status Type deleted successfully",
  };
};

module.exports = {
  createVehicleStatusType,
  getAllVehicleStatusTypes,
  getVehicleStatusTypeById,
  updateVehicleStatusType,
  deleteVehicleStatusType,
};
