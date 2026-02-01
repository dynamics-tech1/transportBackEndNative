const express = require("express");
const router = express.Router();
const {
  createVehicleController,
  updateVehicleController,
  deleteVehicleController,
  getVehiclesController,
} = require("../Controllers/Vehicle.controller");

const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

const { validator } = require("../Middleware/Validator");
const {
  createVehicle,
  updateVehicle,
  vehicleParams,
  getVehiclesQuery,
} = require("../Validations/Vehicle.schema");

router.post(
  "/api/user/vehicles/driverUserUniqueId/:driverUserUniqueId",
  verifyTokenOfAxios,
  validator(vehicleParams, "params"),
  validator(createVehicle),
  createVehicleController,
);

// Consolidated GET with filters & pagination
router.get(
  "/api/vehicles",
  verifyTokenOfAxios,
  validator(getVehiclesQuery, "query"),
  getVehiclesController,
);

// Update vehicle
router.put(
  "/api/user/vehicles/:vehicleUniqueId",
  verifyTokenOfAxios,
  validator(vehicleParams, "params"),
  validator(updateVehicle),
  updateVehicleController,
);

router.delete(
  "/vehicles/:vehicleUniqueId",
  verifyTokenOfAxios,
  validator(vehicleParams, "params"),
  deleteVehicleController,
);

// Note: Removed other GET routes to keep a single way of fetching vehicles

module.exports = router;
