const express = require("express");
const router = express.Router();
const paymentStatusController = require("../../Controllers/PaymentStatus.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");

// Create a new payment status
const { validator } = require("../../Middleware/Validator");
const {
  createPaymentStatus,
  updatePaymentStatus,
  paymentStatusParams,
  getPaymentStatusQuery,
} = require("../../Validations/PaymentStatus.schema");

// Create a new payment status
router.post(
  "/",
  verifyTokenOfAxios,
  validator(createPaymentStatus),
  paymentStatusController.createPaymentStatus,
);

// Get all payment statuses
router.get(
  "/",
  verifyTokenOfAxios,
  validator(getPaymentStatusQuery, "query"),
  paymentStatusController.getAllPaymentStatuses,
);

// Update a specific payment status by ID
router.put(
  "/:paymentStatusUniqueId",
  verifyTokenOfAxios,
  validator(paymentStatusParams, "params"),
  validator(updatePaymentStatus),
  paymentStatusController.updatePaymentStatus,
);

// Delete a specific payment status by ID
router.delete(
  "/:paymentStatusUniqueId",
  verifyTokenOfAxios,
  validator(paymentStatusParams, "params"),
  paymentStatusController.deletePaymentStatus,
);

module.exports = router;
