const express = require("express");
const router = express.Router();
const tariffRateForVehicleTypesController = require("../Controllers/TariffRateForVehicleTypes.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

const { validator } = require("../Middleware/Validator");
const {
  createTariffRateForVehicle,
  updateTariffRateForVehicle,
  tariffRateForVehicleParams,
  getTariffRatesByFilterForVehicleTypesQuery,
} = require("../Validations/TariffRateForVehicleTypes.schema");

// Create a new tariff rate for vehicle type
router.post(
  "/api/admin/tariffRateForVehicleType",
  verifyTokenOfAxios,
  validator(createTariffRateForVehicle),
  tariffRateForVehicleTypesController.createTariffRateForVehicleType,
);

// Get tariff rates for vehicle types with filtering and pagination
// Examples:
//   GET /                                                             → all (paginated)
//   GET /?tariffRateForVehicleTypeUniqueId=uuid                       → single by UUID
//   GET /?vehicleTypeUniqueId=uuid                                    → filter by vehicle type
//   GET /?tariffRateUniqueId=uuid&page=1&limit=5                      → filter by tariff rate
router.get(
  "/api/admin/tariffRateForVehicleType",
  verifyTokenOfAxios,
  validator(getTariffRatesByFilterForVehicleTypesQuery, "query"),
  tariffRateForVehicleTypesController.getTariffRatesByFilterForVehicleTypes,
);

// Update a tariff rate for vehicle type by UUID
router.put(
  "/api/admin/tariffRateForVehicleType/:tariffRateForVehicleTypeUniqueId",
  verifyTokenOfAxios,
  validator(tariffRateForVehicleParams, "params"),
  validator(updateTariffRateForVehicle),
  tariffRateForVehicleTypesController.updateTariffRateForVehicleType,
);

// Soft delete a tariff rate for vehicle type by UUID
router.delete(
  "/api/admin/tariffRateForVehicleType/:tariffRateForVehicleTypeUniqueId",
  verifyTokenOfAxios,
  validator(tariffRateForVehicleParams, "params"),
  tariffRateForVehicleTypesController.deleteTariffRateForVehicleType,
);

module.exports = router;
