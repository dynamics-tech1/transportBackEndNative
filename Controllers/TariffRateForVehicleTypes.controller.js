const tariffRateForVehicleTypesService = require("../Services/TariffRateForVehicleTypes.service");
const ServerResponder = require("../Utils/ServerResponder");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");

// Create a new tariff rate for a vehicle type
exports.createTariffRateForVehicleType = async (req, res, next) => {
  try {
    req.body.user = req.user;
    const result = await executeInTransaction(async () => {
      return await tariffRateForVehicleTypesService.createTariffRateForVehicleType(
        req.body,
      );
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get tariff rates for vehicle types with filtering and pagination
exports.getTariffRatesByFilterForVehicleTypes = async (req, res, next) => {
  try {
    const result =
      await tariffRateForVehicleTypesService.getTariffRatesByFilterForVehicleTypes(
        req.query,
      );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Update a tariff rate for vehicle type by UUID
exports.updateTariffRateForVehicleType = async (req, res, next) => {
  try {
    req.body.user = req.user;
    const result = await executeInTransaction(async () => {
      return await tariffRateForVehicleTypesService.updateTariffRateForVehicleType(
        req.params.tariffRateForVehicleTypeUniqueId,
        req.body,
      );
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Soft delete a tariff rate for vehicle type by UUID
exports.deleteTariffRateForVehicleType = async (req, res, next) => {
  try {
    const user = req.user;
    const result = await executeInTransaction(async () => {
      return await tariffRateForVehicleTypesService.deleteTariffRateForVehicleType(
        req.params.tariffRateForVehicleTypeUniqueId,
        user,
      );
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
