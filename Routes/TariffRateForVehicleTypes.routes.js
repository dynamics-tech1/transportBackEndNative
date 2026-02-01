const express = require("express");
const router = express.Router();
const tariffRateForVehicleTypesController = require("../Controllers/TariffRateForVehicleTypes.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

// Create a new tariff rate for vehicle type
const { validator } = require("../Middleware/Validator");
const {
  createTariffRateForVehicle,
  updateTariffRateForVehicle,
  tariffRateForVehicleParams,
} = require("../Validations/TariffRateForVehicleTypes.schema");

// Create a new tariff rate for vehicle type
router.post(
  "/api/admin/tariffRateForVehicleType",
  verifyTokenOfAxios,
  validator(createTariffRateForVehicle),
  tariffRateForVehicleTypesController.createTariffRateForVehicleType,
);

// Get all tariff rates for vehicle types
router.get(
  "/api/admin/tariffRateForVehicleType",
  verifyTokenOfAxios,
  tariffRateForVehicleTypesController.getAllTariffRatesForVehicleTypes,
);

// Get a tariff rate for vehicle type by ID
router.get(
  "/api/admin/tariffRateForVehicleType/:id",
  verifyTokenOfAxios,
  validator(tariffRateForVehicleParams, "params"),
  tariffRateForVehicleTypesController.getTariffRateForVehicleTypeById,
);

// Update a tariff rate for vehicle type by ID
router.put(
  "/api/admin/tariffRateForVehicleType/:tariffRateForVehicleTypeUniqueId",
  verifyTokenOfAxios,
  validator(tariffRateForVehicleParams, "params"),
  validator(updateTariffRateForVehicle),
  tariffRateForVehicleTypesController.updateTariffRateForVehicleType,
);

// Delete a tariff rate for vehicle type by ID
router.delete(
  "/api/admin/tariffRateForVehicleType/:tariffRateForVehicleTypeUniqueId",
  verifyTokenOfAxios,
  validator(tariffRateForVehicleParams, "params"),
  tariffRateForVehicleTypesController.deleteTariffRateForVehicleType,
);
module.exports = router;
