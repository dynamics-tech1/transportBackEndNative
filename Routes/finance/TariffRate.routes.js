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
} = require("../../Validations/TariffRate.schema");

// Create a new tariff rate
router.post(
  "/",
  verifyTokenOfAxios,
  validator(createTariffRate),
  tariffRateController.createTariffRate,
);

// Get all tariff rates
router.get("/", verifyTokenOfAxios, tariffRateController.getAllTariffRates);

// Get a tariff rate by ID
router.get(
  "/:tariffRateUniqueId",
  verifyTokenOfAxios,
  validator(tariffRateParams, "params"),
  tariffRateController.getTariffRateById,
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
  "/:id",
  verifyTokenOfAxios,
  validator(tariffRateParams, "params"),
  tariffRateController.deleteTariffRate,
);

module.exports = router;
