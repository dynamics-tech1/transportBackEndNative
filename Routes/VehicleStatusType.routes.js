// routes/vehicleStatusType.routes.js
const express = require("express");
const router = express.Router();
const vehicleStatusTypeController = require("../Controllers/VehicleStatusType.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

// Define routes for CRUD operations
const { validator } = require("../Middleware/Validator");
const {
  createVehicleStatusType,
  updateVehicleStatusType,
  vehicleStatusTypeParams,
} = require("../Validations/VehicleStatusType.schema");

// Define routes for CRUD operations
router.post(
  "/vehicleStatusType",
  verifyTokenOfAxios,
  validator(createVehicleStatusType),
  vehicleStatusTypeController.createVehicleStatusType,
);
router.get(
  "/vehicleStatusTypes",
  verifyTokenOfAxios,
  vehicleStatusTypeController.getAllVehicleStatusTypes,
);
router.get(
  "/vehicleStatusType/:id",
  verifyTokenOfAxios,
  validator(vehicleStatusTypeParams, "params"),
  vehicleStatusTypeController.getVehicleStatusTypeById,
);
router.put(
  "/vehicleStatusType/:id",
  verifyTokenOfAxios,
  validator(vehicleStatusTypeParams, "params"),
  validator(updateVehicleStatusType),
  vehicleStatusTypeController.updateVehicleStatusType,
);
router.delete(
  "/vehicleStatusType/:id",
  verifyTokenOfAxios,
  validator(vehicleStatusTypeParams, "params"),
  vehicleStatusTypeController.deleteVehicleStatusType,
);

module.exports = router;
