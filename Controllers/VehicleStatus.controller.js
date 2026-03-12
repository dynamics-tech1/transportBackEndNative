const vehicleStatusService = require("../Services/VehicleStatus.service");
const ServerResponder = require("../Utils/ServerResponder");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");

const createVehicleStatus = async (req, res, next) => {
  try {
    const vehicleStatusCreatedBy = req.user.userUniqueId;
    const result = await executeInTransaction(async () => {
      return await vehicleStatusService.createVehicleStatus({
        ...req.body,
        vehicleStatusCreatedBy,
      });
    });
    ServerResponder(res, result, 201);
  } catch (error) {
    next(error);
  }
};

const getVehicleStatuses = async (req, res, next) => {
  try {
    const result = await vehicleStatusService.getVehicleStatuses(
      req.query || {},
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const getVehicleStatusById = async (req, res, next) => {
  try {
    const result = await vehicleStatusService.getVehicleStatusById(
      req.params.id,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const updateVehicleStatus = async (req, res, next) => {
  try {
    const result = await executeInTransaction(async () => {
      return await vehicleStatusService.updateVehicleStatus(
        req.params.id,
        req.body,
      );
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const deleteVehicleStatus = async (req, res, next) => {
  try {
    const result = await executeInTransaction(async () => {
      return await vehicleStatusService.deleteVehicleStatus(
        req.params.id,
      );
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVehicleStatus,
  getVehicleStatusById,
  updateVehicleStatus,
  deleteVehicleStatus,
  getVehicleStatuses,
};
