const express = require("express");
const router = express.Router();
const journeyController = require("../Controllers/Journey.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const { registerRoutes } = require("../Utils/RouteUtils");

// Apply common middleware once for all routes in this router

const { validator } = require("../Middleware/Validator");
const {
  createJourney,
  updateJourney,
  journeyParams,
  getJourneysQuery,
  completedJourneyCountsQuery,
  searchCompletedJourneyByUserDataQuery,
  getAllCompletedJourneysQuery,
  getOngoingJourneyQuery,
} = require("../Validations/Journey.schema");

// Route configuration
const routes = [
  {
    method: "post",
    path: "/api/journey",
    middleware: [verifyTokenOfAxios, validator(createJourney)],
    handler: journeyController.createJourney,
  },
  {
    method: "get",
    path: "/api/journey/:journeyUniqueId",
    middleware: [verifyTokenOfAxios, validator(journeyParams, "params")],
    handler: journeyController.getJourneyByJourneyUniqueId,
  },
  {
    method: "put",
    path: "/api/journey/:journeyUniqueId",
    middleware: [
      verifyTokenOfAxios,
      validator(journeyParams, "params"),
      validator(updateJourney),
    ],
    handler: journeyController.updateJourney,
  },
  {
    method: "delete",
    path: "/api/journey/:journeyUniqueId",
    middleware: [verifyTokenOfAxios, validator(journeyParams, "params")],
    handler: journeyController.deleteJourney,
  },
  {
    method: "get",
    path: "/api/user/getCompletedJourneyCountsByDate",
    middleware: [
      verifyTokenOfAxios,
      validator(completedJourneyCountsQuery, "query"),
    ],
    handler: journeyController.getCompletedJourneyCountsByDate,
  },
  {
    method: "get",
    path: "/api/user/searchCompletedJourneyByUserData",
    middleware: [
      verifyTokenOfAxios,
      validator(searchCompletedJourneyByUserDataQuery, "query"),
    ],
    handler: journeyController.searchCompletedJourneyByUserData,
  },
  {
    method: "get",
    path: "/api/driver/getAllCompletedJourney",
    middleware: [
      verifyTokenOfAxios,
      validator(getAllCompletedJourneysQuery, "query"),
    ],
    handler: journeyController.getAllCompletedJourneys,
  },

  {
    method: "get",
    path: "/api/user/getOngoingJourney",
    middleware: [
      verifyTokenOfAxios,
      validator(getOngoingJourneyQuery, "query"),
    ],
    handler: journeyController.getOngoingJourney,
  },

  {
    method: "get",
    path: "/api/journey",
    middleware: [verifyTokenOfAxios, validator(getJourneysQuery, "query")],
    handler: journeyController.getJourneys,
  },
];

// Register all routes
registerRoutes(router, routes);

module.exports = router;
