const express = require("express");
const router = express.Router();
const controller = require("../Controllers/VehicleOwnership.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

const { validator } = require("../Middleware/Validator");
const {
  createVehicleOwnership,
  updateVehicleOwnership,
  ownershipParams,
} = require("../Validations/VehicleOwnership.schema");

router.post(
  "/api/admin/vehicleOwnerships",
  verifyTokenOfAxios,
  validator(createVehicleOwnership),
  controller.createVehicleOwnershipController,
); // Create vehicle ownership

// Single filterable list endpoint
router.get(
  "/api/admin/vehicleOwnerships",
  verifyTokenOfAxios,
  controller.listVehicleOwnershipsController,
);

router.put(
  "/api/admin/vehicleOwnerships",
  verifyTokenOfAxios,
  validator(updateVehicleOwnership),
  controller.updateVehicleOwnershipController,
); // Update vehicle ownership

router.delete(
  "/api/admin/vehicleOwnerships/:ownershipId",
  verifyTokenOfAxios,
  validator(ownershipParams, "params"),
  controller.deleteVehicleOwnershipController,
); // Delete vehicle ownership
module.exports = router;
