// role.routes.js

const express = require("express");
const { verifyAdminsIdentity } = require("../Middleware/VerifyUsersIdentity");
const controller = require("../Controllers/Role.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");

const router = express.Router();

const { validator } = require("../Middleware/Validator");
const {
  createRole,
  updateRole,
  roleParams,
  getAllRolesQuery,
} = require("../Validations/Role.schema");

// Define CRUD routes
router.post(
  "/api/admin/roles",
  verifyTokenOfAxios,
  validator(createRole),
  controller.createRoleController,
); // Create a new role

// router.get(
//   "/api/admin/roles/:id",
//   verifyTokenOfAxios,
//   verifyAdminsIdentity,
//   validator(roleParams, "params"),
//   controller.getRoleController
// ); // Get a role by ID
router.put(
  "/api/admin/roles/:roleUniqueId",
  verifyTokenOfAxios,
  verifyAdminsIdentity,
  validator(roleParams, "params"),
  validator(updateRole),
  controller.updateRoleController,
); // Update a role by ID
router.delete(
  "/api/admin/roles/:roleUniqueId",
  verifyTokenOfAxios,
  verifyAdminsIdentity,
  validator(roleParams, "params"),
  controller.deleteRoleController,
); // Delete a role by ID
router.get(
  "/api/admin/roles",
  verifyTokenOfAxios,
  verifyAdminsIdentity,
  validator(getAllRolesQuery, "query"),
  controller.getAllRolesController,
); // Get all roles

module.exports = router;
