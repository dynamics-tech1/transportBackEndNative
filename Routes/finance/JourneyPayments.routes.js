const express = require("express");
const router = express.Router();
const journeyPaymentsController = require("../../Controllers/JourneyPayments.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");

// Create a new journey payment
const { validator } = require("../../Middleware/Validator");
const {
  createJourneyPayment,
  updateJourneyPayment,
  journeyPaymentParams,
  getJourneyPaymentsQuery,
} = require("../../Validations/JourneyPayments.schema");

// Create a new journey payment
router.post(
  "/",
  verifyTokenOfAxios,
  validator(createJourneyPayment),
  journeyPaymentsController.createJourneyPayment,
);

// Get all journey payments with pagination and filtering
router.get(
  "/",
  verifyTokenOfAxios,
  validator(getJourneyPaymentsQuery, "query"),
  journeyPaymentsController.getAllJourneyPayments,
);

// Get a specific journey payment by ID
router.get(
  "/:paymentUniqueId",
  verifyTokenOfAxios,
  validator(journeyPaymentParams, "params"),
  journeyPaymentsController.getJourneyPaymentById,
);

// Update a specific journey payment by ID
router.put(
  "/:paymentUniqueId",
  verifyTokenOfAxios,
  validator(journeyPaymentParams, "params"),
  validator(updateJourneyPayment),
  journeyPaymentsController.updateJourneyPayment,
);

// Delete a specific journey payment by ID
router.delete(
  "/:paymentUniqueId",
  verifyTokenOfAxios,
  validator(journeyPaymentParams, "params"),
  journeyPaymentsController.deleteJourneyPayment,
);

module.exports = router;
