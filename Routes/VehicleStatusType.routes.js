// routes/vehicleStatusType.routes.js
const express = require("express");
const router = express.Router();
const vehicleStatusTypeController = require("../Controllers/VehicleStatusType.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const { validator } = require("../Middleware/Validator");

const {
  createVehicleStatusType,
  updateVehicleStatusType,
  vehicleStatusTypeParams,
  vehicleStatusTypeQuery,
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
  validator(vehicleStatusTypeQuery, "query"),
  vehicleStatusTypeController.getAllVehicleStatusTypes,
);

router.put(
  "/vehicleStatusType/:vehicleStatusTypeUniqueId",
  verifyTokenOfAxios,
  validator(vehicleStatusTypeParams, "params"),
  validator(updateVehicleStatusType),
  vehicleStatusTypeController.updateVehicleStatusType,
);

router.delete(
  "/vehicleStatusType/:vehicleStatusTypeUniqueId",
  verifyTokenOfAxios,
  validator(vehicleStatusTypeParams, "params"),
  vehicleStatusTypeController.deleteVehicleStatusType,
);

module.exports = router;
