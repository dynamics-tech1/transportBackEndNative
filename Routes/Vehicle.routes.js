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
  vehicleUniqueIdParam,
  driverUserUniqueIdParam,
  getVehiclesQuery,
} = require("../Validations/Vehicle.schema");

router.post(
  "/api/user/vehicles/driverUserUniqueId/:driverUserUniqueId",
  verifyTokenOfAxios,
  validator(driverUserUniqueIdParam, "params"),
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
  validator(vehicleUniqueIdParam, "params"),
  validator(updateVehicle),
  updateVehicleController,
);

router.delete(
  "/api/user/vehicles/:vehicleUniqueId",
  verifyTokenOfAxios,
  validator(vehicleUniqueIdParam, "params"),
  deleteVehicleController,
); 

module.exports = router;
