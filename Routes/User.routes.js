// routes/userRoutes.js
const express = require("express");
const controller = require("../Controllers/User.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const {
  verifyAdminsIdentity,
  verifyIfOperationIsAllowedByUserDriver,
} = require("../Middleware/VerifyUsersIdentity");
const upload = require("../Config/MulterConfig");

const { validator } = require("../Middleware/Validator");
const loginRateLimiter = require("../Middleware/LoginRateLimiter");
const {
  createUser,
  createUserByAdmin,
  loginUser,
  verifyUserByOTP,
  updateUser,
  userIdParams,
  ownerUserIdParams,
  getUserFilter,
} = require("../Validations/User.schema");

const router = express.Router();

// get users by role route removed — use getUserByFilterDetailed instead

router.post(
  "/api/user/createUser",
  validator(createUser),
  controller.createUser,
);

router.post(
  "/api/admin/createUserByAdminOrSuperAdmin",
  verifyTokenOfAxios,
  verifyAdminsIdentity,
  validator(createUserByAdmin),
  controller.createUserByAdminOrSuperAdmin,
);

// log in / register user by phone number
router.get(
  "/api/user/loginUser",
  validator(loginUser, "query"),
  loginRateLimiter(),
  controller.loginUser,
);

router.post(
  "/api/user/loginUser",
  validator(loginUser),
  loginRateLimiter(),
  controller.loginUser,
);

router.post(
  "/api/user/verifyUserByOTP",
  validator(verifyUserByOTP),
  controller.verifyUserByOTP,
);

router.put(
  "/api/user/updateUser/:ownerUserUniqueId",
  verifyTokenOfAxios,
  verifyIfOperationIsAllowedByUserDriver,
  upload.any(),
  validator(ownerUserIdParams, "params"),
  validator(updateUser), // Body validation (note: might conflict with multipart/form-data if not handled carefully, typically Joi runs on req.body which multer populates)
  controller.updateUser,
);

router.delete(
  "/api/user/deleteUser/:userUniqueId",
  verifyTokenOfAxios,
  validator(userIdParams, "params"),
  controller.deleteUser,
);

router.get(
  "/api/admin/getUserByFilterDetailed",
  verifyTokenOfAxios,
  validator(getUserFilter, "query"),
  controller.getUserByFilterDetailed,
);

module.exports = router;
