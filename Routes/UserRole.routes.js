const express = require("express");
const router = express.Router();
const userRoleController = require("../Controllers/UserRole.controller");
const {
  verifyTokenOfAxios,
  verifyIfUserIsSupperAdmin,
} = require("../Middleware/VerifyToken");
const { verifyAdminsIdentity } = require("../Middleware/VerifyUsersIdentity");

const { validator } = require("../Middleware/Validator");
const {
  createUserRole,
  updateUserRole,
  userRoleParams,
  getUserRoleFilter,
} = require("../Validations/UserRole.schema");

// Routes for CRUD operations
router.post(
  "/api/admin/userRole/create",
  verifyTokenOfAxios,
  verifyIfUserIsSupperAdmin,
  validator(createUserRole),
  userRoleController.createUserRole,
);
// Get user roles with pagination and filtering
router.get(
  "/api/admin/getUserRoleListByFilter",
  verifyTokenOfAxios,
  verifyAdminsIdentity,
  validator(getUserRoleFilter, "query"),
  userRoleController.getUserRoleListByFilter,
);

router.put(
  "/api/admin/userRole/:userRoleUniqueId",
  verifyTokenOfAxios,
  validator(userRoleParams, "params"),
  validator(updateUserRole),
  userRoleController.updateUserRole,
);
router.delete(
  "/api/admin/userRole/:userRoleUniqueId",
  verifyTokenOfAxios,
  validator(userRoleParams, "params"),
  userRoleController.deleteUserRole,
);

module.exports = router;
