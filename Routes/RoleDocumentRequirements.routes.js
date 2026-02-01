const express = require("express");
const router = express.Router();
const RoleDocumentRequirementsController = require("../Controllers/RoleDocumentRequirements.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const { validator } = require("../Middleware/Validator");
const {
  createRoleDocumentRequirement,
  updateRoleDocumentRequirement,
  roleDocumentRequirementParams,
  getRoleDocumentRequirementsQuery,
} = require("../Validations/RoleDocumentRequirements.schema");

// Create a new role-document mapping
router.post(
  "/api/RoleDocumentRequirements",
  verifyTokenOfAxios,
  validator(createRoleDocumentRequirement),
  RoleDocumentRequirementsController.createMapping,
);
// Consolidated filterable GET (paginated)
router.get(
  "/api/RoleDocumentRequirements",
  verifyTokenOfAxios,
  validator(getRoleDocumentRequirementsQuery, "query"),
  RoleDocumentRequirementsController.getRoleDocumentRequirements,
);
// Update a mapping by ID
router.put(
  "/api/RoleDocumentRequirements/:roleDocumentRequirementUniqueId",
  verifyTokenOfAxios,
  validator(roleDocumentRequirementParams, "params"),
  validator(updateRoleDocumentRequirement),
  RoleDocumentRequirementsController.updateMapping,
);
// Delete a mapping by ID
router.delete(
  "/api/RoleDocumentRequirements/:roleDocumentRequirementUniqueId",
  verifyTokenOfAxios,
  validator(roleDocumentRequirementParams, "params"),
  RoleDocumentRequirementsController.deleteMapping,
);
module.exports = router;
