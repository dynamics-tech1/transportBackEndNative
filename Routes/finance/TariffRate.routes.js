const express = require("express");
const router = express.Router();
const tariffRateController = require("../../Controllers/TariffRate.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");

// Create a new tariff rate
const { validator } = require("../../Middleware/Validator");
const {
  createTariffRate,
  updateTariffRate,
  tariffRateParams,
  getTariffRatesByFiltersQuery,
} = require("../../Validations/TariffRate.schema");

// Create a new tariff rate
router.post(
  "/",
  verifyTokenOfAxios,
  validator(createTariffRate),
  tariffRateController.createTariffRate,
);

// Get tariff rates with filtering and pagination
// Examples:
//   GET /                                          → all rates (paginated)
//   GET /?tariffRateUniqueId=uuid                  → single rate by ID
//   GET /?tariffRateName=base&page=1&limit=5       → search by name
router.get(
  "/",
  verifyTokenOfAxios,
  validator(getTariffRatesByFiltersQuery, "query"),
  tariffRateController.getTariffRatesByFilter,
);

// Update a tariff rate by ID
router.put(
  "/:tariffRateUniqueId",
  verifyTokenOfAxios,
  validator(tariffRateParams, "params"),
  validator(updateTariffRate),
  tariffRateController.updateTariffRate,
);

// Delete a tariff rate by ID
router.delete(
  "/:tariffRateUniqueId",
  verifyTokenOfAxios,
  validator(tariffRateParams, "params"),
  tariffRateController.deleteTariffRate,
);

module.exports = router;
