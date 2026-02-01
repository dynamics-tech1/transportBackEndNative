const express = require("express");
const router = express.Router();
const userStatusesController = require("../Controllers/UserStatus.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

// Routes for CRUD operations
const { validator } = require("../Middleware/Validator");
const {
  createUserStatus,
  updateUserStatus,
  userStatusParams,
} = require("../Validations/UserStatus.schema");

// Routes for CRUD operations
router.post(
  "/userStatuses/create",
  verifyTokenOfAxios,
  validator(createUserStatus),
  userStatusesController.createUserStatus,
);
router.get(
  "/userStatuses/:id",
  verifyTokenOfAxios,
  validator(userStatusParams, "params"),
  userStatusesController.getUserStatusById,
);
router.put(
  "/userStatuses/:id",
  verifyTokenOfAxios,
  validator(userStatusParams, "params"),
  validator(updateUserStatus),
  userStatusesController.updateUserStatus,
);
router.delete(
  "/userStatuses/:id",
  verifyTokenOfAxios,
  validator(userStatusParams, "params"),
  userStatusesController.deleteUserStatus,
);

module.exports = router;
