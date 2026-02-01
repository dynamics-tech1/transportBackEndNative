const vehicleStatusTypeService = require("../Services/VehicleStatusType.service");
const ServerResponder = require("../Utils/ServerResponder");

// Create a new VehicleStatusType
const createVehicleStatusType = async (req, res, next) => {
  try {
    const result = await vehicleStatusTypeService.createVehicleStatusType(
      req.body,
    );
    ServerResponder(res, result, 201);
  } catch (error) {
    next(error);
  }
};

// Get all VehicleStatusTypes
const getAllVehicleStatusTypes = async (req, res, next) => {
  try {
    const result = await vehicleStatusTypeService.getAllVehicleStatusTypes();
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get a single VehicleStatusType by ID
const getVehicleStatusTypeById = async (req, res, next) => {
  try {
    const result = await vehicleStatusTypeService.getVehicleStatusTypeById(
      req.params.id,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Update VehicleStatusType by ID
const updateVehicleStatusType = async (req, res, next) => {
  try {
    const result = await vehicleStatusTypeService.updateVehicleStatusType(
      req.params.id,
      req.body,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Delete VehicleStatusType by ID
const deleteVehicleStatusType = async (req, res, next) => {
  try {
    const result = await vehicleStatusTypeService.deleteVehicleStatusType(
      req.params.id,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVehicleStatusType,
  getAllVehicleStatusTypes,
  getVehicleStatusTypeById,
  updateVehicleStatusType,
  deleteVehicleStatusType,
};
