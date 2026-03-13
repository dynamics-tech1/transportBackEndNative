const express = require("express");
const router = express.Router();
const vehicleStatusController = require("../Controllers/VehicleStatus.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const { validator } = require("../Middleware/Validator");

// Define routes for CRUD operations
const {
  createVehicleStatus,
  updateVehicleStatus,
  vehicleStatusParams,
  vehicleStatusQuery,
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
  validator(vehicleStatusQuery, "query"),
  vehicleStatusController.getVehicleStatuses,
);

router.put(
  "/vehicleStatus/:vehicleStatusUniqueId",
  verifyTokenOfAxios,
  validator(vehicleStatusParams, "params"),
  validator(updateVehicleStatus),
  vehicleStatusController.updateVehicleStatus,
);

router.delete(
  "/vehicleStatus/:vehicleStatusUniqueId",
  verifyTokenOfAxios,
  validator(vehicleStatusParams, "params"),
  vehicleStatusController.deleteVehicleStatus,
);

module.exports = router;
