const express = require("express");
const router = express.Router();
const paymentMethodController = require("../../Controllers/PaymentMethod.controller");
const {
  verifyTokenOfAxios,
  verifyIfUserIsAdminOrSupperAdmin,
} = require("../../Middleware/VerifyToken");

// Create a new payment method
const { validator } = require("../../Middleware/Validator");
const {
  createPaymentMethod,
  updatePaymentMethod,
  paymentMethodParams,
  getPaymentMethodQuery,
} = require("../../Validations/PaymentMethod.schema");

// Create a new payment method
router.post(
  "/",
  verifyTokenOfAxios,
  verifyIfUserIsAdminOrSupperAdmin,

  validator(createPaymentMethod),
  paymentMethodController.createPaymentMethod,
);

// Get all payment methods
router.get(
  "/",
  verifyTokenOfAxios,

  validator(getPaymentMethodQuery, "query"),
  paymentMethodController.getAllPaymentMethods,
);

// Update a specific payment method by ID
router.put(
  "/:paymentMethodUniqueId",
  verifyTokenOfAxios,
  verifyIfUserIsAdminOrSupperAdmin,
  validator(paymentMethodParams, "params"),
  validator(updatePaymentMethod),
  paymentMethodController.updatePaymentMethod,
);

// Delete a specific payment method by ID
router.delete(
  "/:paymentMethodUniqueId",
  verifyTokenOfAxios,
  verifyIfUserIsAdminOrSupperAdmin,
  validator(paymentMethodParams, "params"),
  paymentMethodController.deletePaymentMethod,
);

module.exports = router;
