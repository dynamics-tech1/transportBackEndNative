const tariffRateForVehicleTypesService = require("../Services/TariffRateForVehicleTypes.service");
const ServerResponder = require("../Utils/ServerResponder");

// Create a new tariff rate for a vehicle type
exports.createTariffRateForVehicleType = async (req, res, next) => {
  try {
    const result =
      await tariffRateForVehicleTypesService.createTariffRateForVehicleType(
        req.body,
      );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get all tariff rates for vehicle types
exports.getAllTariffRatesForVehicleTypes = async (req, res, next) => {
  try {
    const result =
      await tariffRateForVehicleTypesService.getAllTariffRatesForVehicleTypes();
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get a tariff rate for vehicle type by ID
exports.getTariffRateForVehicleTypeById = async (req, res, next) => {
  try {
    const result =
      await tariffRateForVehicleTypesService.getTariffRateForVehicleTypeById(
        req.params.id,
      );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Update a tariff rate for vehicle type by ID
exports.updateTariffRateForVehicleType = async (req, res, next) => {
  try {
    const result =
      await tariffRateForVehicleTypesService.updateTariffRateForVehicleType(
        req.params.tariffRateForVehicleTypeUniqueId,
        req.body,
      );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Delete a tariff rate for vehicle type by ID
exports.deleteTariffRateForVehicleType = async (req, res, next) => {
  try {
    const result =
      await tariffRateForVehicleTypesService.deleteTariffRateForVehicleType(
        req.params.tariffRateForVehicleTypeUniqueId,
      );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
