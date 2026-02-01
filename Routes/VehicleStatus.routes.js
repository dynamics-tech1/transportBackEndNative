const express = require("express");
const router = express.Router();
const vehicleStatusController = require("../Controllers/VehicleStatus.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

// Define routes for CRUD operations
const { validator } = require("../Middleware/Validator");
const {
  createVehicleStatus,
  updateVehicleStatus,
  vehicleStatusParams,
} = require("../Validations/VehicleStatus.schema");

// Define routes for CRUD operations
router.post(
  "/vehicleStatus",
  verifyTokenOfAxios,
  validator(createVehicleStatus),
  vehicleStatusController.createVehicleStatus,
);
router.get(
  "/vehicleStatus",
  verifyTokenOfAxios,
  vehicleStatusController.getVehicleStatuses,
);
router.get(
  "/vehicleStatus/:id",
  verifyTokenOfAxios,
  validator(vehicleStatusParams, "params"),
  vehicleStatusController.getVehicleStatusById,
);
router.put(
  "/vehicleStatus/:id",
  verifyTokenOfAxios,
  validator(vehicleStatusParams, "params"),
  validator(updateVehicleStatus),
  vehicleStatusController.updateVehicleStatus,
);
router.delete(
  "/vehicleStatus/:id",
  verifyTokenOfAxios,
  validator(vehicleStatusParams, "params"),
  vehicleStatusController.deleteVehicleStatus,
);

module.exports = router;
