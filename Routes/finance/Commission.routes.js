const express = require("express");
const router = express.Router();
const commissionController = require("../../Controllers/Commission.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");
const { validator } = require("../../Middleware/Validator");
const {
  createCommission,
  updateCommission,
  getAllCommissions,
  commissionIdSchema,
} = require("../../Validations/Commission.schema");

// Create a new commission record
router.post(
  "/",
  verifyTokenOfAxios,
  validator(createCommission),
  commissionController.createCommission,
);

// Get all commission records
router.get(
  "/",
  verifyTokenOfAxios,
  validator(getAllCommissions, "query"),
  commissionController.getAllCommissions,
);

// Update a commission record by ID
router.put(
  "/:id",
  verifyTokenOfAxios,
  validator(commissionIdSchema, "params"),
  validator(updateCommission),
  commissionController.updateCommission,
);

// Delete a commission record by ID
router.delete(
  "/:id",
  verifyTokenOfAxios,
  validator(commissionIdSchema, "params"),
  commissionController.deleteCommission,
);

module.exports = router;
