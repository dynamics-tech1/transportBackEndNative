const express = require("express");
const router = express.Router();
const controller = require("../../Controllers/DepositSource.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");

// Create new source
const { validator } = require("../../Middleware/Validator");
const {
  createDepositSource,
  updateDepositSource,
  depositSourceParams,
} = require("../../Validations/DepositSource.schema");

// Create new source
router.post(
  "/",
  verifyTokenOfAxios,
  validator(createDepositSource),
  controller.createDepositSource,
);

// Get all sources
router.get("/", verifyTokenOfAxios, controller.getAllDepositSources);

// Get by UUID
router.get(
  "/:depositSourceUniqueId",
  verifyTokenOfAxios,
  validator(depositSourceParams, "params"),
  controller.getDepositSourceByUniqueId,
);

// Update by UUID
router.put(
  "/:depositSourceUniqueId",
  verifyTokenOfAxios,
  validator(depositSourceParams, "params"),
  validator(updateDepositSource),
  controller.updateDepositSourceByUniqueId,
);

// Delete by UUID
router.delete(
  "/:depositSourceUniqueId",
  verifyTokenOfAxios,
  validator(depositSourceParams, "params"),
  controller.deleteDepositSourceByUniqueId,
);

module.exports = router;
