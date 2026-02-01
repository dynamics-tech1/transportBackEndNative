const express = require("express");
const router = express.Router();
const commissionStatusController = require("../../Controllers/CommissionStatus.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");

const { validator } = require("../../Middleware/Validator");
const {
  createCommissionStatus,
  updateCommissionStatus,
  getAllCommissionStatuses,
} = require("../../Validations/CommissionStatus.schema");

// Create
router.post(
  "/admin/commission-statuses",
  verifyTokenOfAxios,
  validator(createCommissionStatus),
  commissionStatusController.createCommissionStatus,
);

// Get all (with filters)
router.get(
  "/admin/commission-statuses",
  verifyTokenOfAxios,
  validator(getAllCommissionStatuses, "query"),
  commissionStatusController.getAllCommissionStatuses,
);

// Update
router.put(
  "/admin/commission-statuses/:id",
  verifyTokenOfAxios,
  validator(updateCommissionStatus),
  commissionStatusController.updateCommissionStatus,
);

// Delete
router.delete(
  "/admin/commission-statuses/:id",
  verifyTokenOfAxios,
  commissionStatusController.deleteCommissionStatus,
);

module.exports = router;
