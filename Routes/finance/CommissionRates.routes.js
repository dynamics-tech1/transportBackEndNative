const express = require("express");
const router = express.Router();
const commissionRatesController = require("../../Controllers/CommissionRates.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");

const { validator } = require("../../Middleware/Validator");
const {
  createCommissionRate,
  updateCommissionRate,
  getAllCommissionRates,
  commissionRateIdSchema,
} = require("../../Validations/CommissionRates.schema");

router.post(
  "/",
  verifyTokenOfAxios,
  validator(createCommissionRate),
  commissionRatesController.createCommissionRate,
);

router.get(
  "/",
  verifyTokenOfAxios,
  validator(getAllCommissionRates, "query"),
  commissionRatesController.getAllCommissionRates,
);

router.put(
  "/:commissionRateUniqueId",
  verifyTokenOfAxios,
  validator(commissionRateIdSchema, "params"),
  validator(updateCommissionRate),
  commissionRatesController.updateCommissionRateByUniqueId,
);

router.delete(
  "/:commissionRateUniqueId",
  verifyTokenOfAxios,
  validator(commissionRateIdSchema, "params"),
  commissionRatesController.deleteCommissionRateByUniqueId,
);

module.exports = router;
