const express = require("express");
const router = express.Router();
const journeyStatusController = require("../Controllers/JourneyStatus.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

// Create a new journey status
const { validator } = require("../Middleware/Validator");
const {
  createJourneyStatus,
  updateJourneyStatus,
  journeyStatusParams,
  getJourneyStatusQuery,
} = require("../Validations/JourneyStatus.schema");

// Create a new journey status
router.post(
  "/api/admin/journeyStatus",
  verifyTokenOfAxios,
  validator(createJourneyStatus),
  journeyStatusController.createJourneyStatus,
);

// Get journey statuses (filterable + paginated)
router.get(
  "/api/admin/journeyStatus",
  verifyTokenOfAxios,
  validator(getJourneyStatusQuery, "query"),
  journeyStatusController.getAllJourneyStatuses,
);

// Update a journey status by ID
router.put(
  "/api/admin/journeyStatus/:journeyStatusUniqueId",
  verifyTokenOfAxios,
  validator(journeyStatusParams, "params"),
  validator(updateJourneyStatus),
  journeyStatusController.updateJourneyStatus,
);

// Delete a journey status by ID
router.delete(
  "/api/admin/journeyStatus/:journeyStatusUniqueId",
  verifyTokenOfAxios,
  validator(journeyStatusParams, "params"),
  journeyStatusController.deleteJourneyStatus,
);

module.exports = router;
