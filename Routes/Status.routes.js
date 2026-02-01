const express = require("express");
const {
  createStatusController,
  updateStatusController,
  deleteStatusController,
  getAllStatusesController,
} = require("../Controllers/Status.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

const router = express.Router();

// Define CRUD routes
const { validator } = require("../Middleware/Validator");
const {
  createStatus,
  updateStatus,
  statusParams,
  getStatusesQuery,
} = require("../Validations/Status.schema");

// Define CRUD routes
router.post(
  "/api/admin/statuses",
  verifyTokenOfAxios,
  validator(createStatus),
  createStatusController,
); // Create a new status

router.put(
  "/api/admin/statuses/:statusUniqueId",
  verifyTokenOfAxios,
  validator(statusParams, "params"),
  validator(updateStatus),
  updateStatusController,
); // Update a status by ID

router.delete(
  "/api/admin/statuses/:statusUniqueId",
  verifyTokenOfAxios,
  validator(statusParams, "params"),
  deleteStatusController,
); // Delete a status by ID

router.get(
  "/api/admin/statuses",
  verifyTokenOfAxios,
  validator(getStatusesQuery, "query"),
  getAllStatusesController,
); // Get all statuses with pagination and search

module.exports = router;
