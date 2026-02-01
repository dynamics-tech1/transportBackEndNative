const express = require("express");
const router = express.Router();
const journeyDecisionsController = require("../Controllers/JourneyDecisions.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

// Create a new journey decision
const { validator } = require("../Middleware/Validator");
const {
  createJourneyDecision,
  updateJourneyDecision,
  journeyDecisionParams,
  getJourneyDecisionsQuery,
} = require("../Validations/JourneyDecisions.schema");

// Create a new journey decision
router.post(
  "/api/journeyDecisions",
  verifyTokenOfAxios,
  validator(createJourneyDecision),
  journeyDecisionsController.createJourneyDecision,
);

// Get journey decisions (supports all GET use cases with filters)
router.get(
  "/api/user/getJourneyDecision4AllOrSingleUser",
  verifyTokenOfAxios,
  validator(getJourneyDecisionsQuery, "query"),
  journeyDecisionsController.getJourneyDecision4AllOrSingleUser,
);

// Update a specific journey decision by ID
router.put(
  "/api/journeyDecisions",
  verifyTokenOfAxios,
  validator(journeyDecisionParams, "params"),
  validator(updateJourneyDecision),
  journeyDecisionsController.updateJourneyDecision,
);

// Delete a specific journey decision by ID
router.delete(
  "/api/journeyDecisions/:id",
  verifyTokenOfAxios,
  validator(journeyDecisionParams, "params"),
  journeyDecisionsController.deleteJourneyDecision,
);

module.exports = router;
