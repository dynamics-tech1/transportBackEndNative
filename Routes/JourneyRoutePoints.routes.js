const express = require("express");
const router = express.Router();
const journeyRoutePointsController = require("../Controllers/JourneyRoutePoints.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

// Create a new route point
const { validator } = require("../Middleware/Validator");
const {
  createJourneyRoutePoint,
  updateJourneyRoutePoint,
  journeyRoutePointParams,
  getJourneyRoutePointsQuery,
} = require("../Validations/JourneyRoutePoints.schema");

// Create a new route point
router.post(
  "/api/journeyRoutePoints",
  verifyTokenOfAxios,
  validator(createJourneyRoutePoint),
  journeyRoutePointsController.createJourneyRoutePoint,
);

// Get all route points for a specific journey
router.get(
  "/api/journeyRoutePoints",
  verifyTokenOfAxios,
  validator(getJourneyRoutePointsQuery, "query"),
  journeyRoutePointsController.getJourneyRoutePoints,
);

// Update a specific route point by pointId
router.put(
  "/api/journeyRoutePoints/:pointId",
  verifyTokenOfAxios,
  validator(journeyRoutePointParams, "params"),
  validator(updateJourneyRoutePoint),
  journeyRoutePointsController.updateJourneyRoutePoint,
);

// Delete a specific route point by pointId
router.delete(
  "/api/journeyRoutePoints/:pointId",
  verifyTokenOfAxios,
  validator(journeyRoutePointParams, "params"),
  journeyRoutePointsController.deleteJourneyRoutePoint,
);

module.exports = router;
