/**
 * @fileoverview Journey Payments Routes
 * @description Routes for managing journey payments in the ride-hailing system.
 *
 * @note IMPORTANT: This module is currently UNUSED in the journey completion process.
 * Payments are currently handled via the journeyDecision table's shippingCostByDriver column.
 * This routes file and associated JourneyPayments table will be activated in the future
 * when payment processing is separated from journey decision data.
 *
 * Current flow: Commission is calculated from shippingCostByDriver on journey completion.
 * Future flow: Payment records will be created separately, then linked to commissions.
 */

// this part of code and table is not used yet in any journey completion process, but it will be used in the future if payment is separated from journeyDecision table column shippingCostByDriver
//

const express = require("express");
const router = express.Router();
const journeyPaymentsController = require("../../Controllers/JourneyPayments.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");

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
