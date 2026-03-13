const express = require("express");
const router = express.Router();
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const ctrl = require("../Controllers/VehicleDriver.controller");

const { validator } = require("../Middleware/Validator");
const {
  createVehicleDriver,
  updateVehicleDriver,
  vehicleDriverQuery,
  vehicleDriverParams,
} = require("../Validations/VehicleDriver.schema");

// Create
router.post(
  "/api/vehicleDriver",
  verifyTokenOfAxios,
  validator(createVehicleDriver),
  ctrl.createVehicleDriverController,
);

// Consolidated GET with filters + pagination
router.get(
  "/api/vehicleDriver",
  verifyTokenOfAxios,
  validator(vehicleDriverQuery, "query"),
  ctrl.getVehicleDriversController,
);

// Update
router.put(
  "/api/vehicleDriver/:vehicleDriverUniqueId",
  verifyTokenOfAxios,
  validator(vehicleDriverParams, "params"),
  validator(updateVehicleDriver),
  ctrl.updateVehicleDriverController,
);

// Delete
router.delete(
  "/api/vehicleDriver/:vehicleDriverUniqueId",
  verifyTokenOfAxios,
  validator(vehicleDriverParams, "params"),
  ctrl.deleteVehicleDriverController,
);

module.exports = router;
