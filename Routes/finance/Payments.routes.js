const express = require("express");
const router = express.Router();
const paymentsController = require("../../Controllers/Payments.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");

const { validator } = require("../../Middleware/Validator");
const {
  createPayment,
  updatePayment,
  paymentParams,
  userPaymentParams,
} = require("../../Validations/Payments.schema");

// Create a new payment
router.post(
  "/",
  verifyTokenOfAxios,
  validator(createPayment),
  paymentsController.createPayment,
);

// Get all payments
router.get("/", verifyTokenOfAxios, paymentsController.getAllPayments);

// Get a specific payment by ID
router.get(
  "/:userUniqueId/:fromDate/:toDate",
  verifyTokenOfAxios,
  validator(userPaymentParams, "params"),
  paymentsController.getPaymentsByUserUniqueId,
);
// Get a specific payment by ID
router.get(
  "/:id",
  verifyTokenOfAxios,
  validator(paymentParams, "params"),
  paymentsController.getPaymentById,
);

// Update a specific payment by ID
router.put(
  "/:id",
  verifyTokenOfAxios,
  validator(paymentParams, "params"),
  validator(updatePayment),
  paymentsController.updatePayment,
);

// Delete a specific payment by ID
router.delete(
  "/:id",
  verifyTokenOfAxios,
  validator(paymentParams, "params"),
  paymentsController.deletePayment,
);

module.exports = router;
