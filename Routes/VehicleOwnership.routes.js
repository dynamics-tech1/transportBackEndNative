const express = require("express");
const router = express.Router();
const controller = require("../Controllers/VehicleOwnership.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

const { validator } = require("../Middleware/Validator");
const {
  createVehicleOwnership,
  updateVehicleOwnership,
  ownershipParams,
  ownershipQuery,
} = require("../Validations/VehicleOwnership.schema");

router.post(
  "/api/admin/vehicleOwnerships",
  verifyTokenOfAxios,
  validator(createVehicleOwnership),
  controller.createVehicleOwnershipController,
);

router.get(
  "/api/admin/vehicleOwnerships",
  verifyTokenOfAxios,
  validator(ownershipQuery, "query"),
  controller.listVehicleOwnershipsController,
);

router.put(
  "/api/admin/vehicleOwnerships/:ownershipUniqueId",
  verifyTokenOfAxios,
  validator(ownershipParams, "params"),
  validator(updateVehicleOwnership),
  controller.updateVehicleOwnershipController,
);

router.delete(
  "/api/admin/vehicleOwnerships/:ownershipUniqueId",
  verifyTokenOfAxios,
  validator(ownershipParams, "params"),
  controller.deleteVehicleOwnershipController,
); // Delete vehicle ownership
module.exports = router;
