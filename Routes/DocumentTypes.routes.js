const express = require("express");
const router = express.Router();
const documentTypesController = require("../Controllers/DocumentTypes.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const { verifyAdminsIdentity } = require("../Middleware/VerifyUsersIdentity");
const checkDocumentTypeExists = require("../Middleware/CheckDocumentTypeExists");

// Define routes for CRUD operations with camelCase
const { validator } = require("../Middleware/Validator");
const {
  createDocumentType,
  updateDocumentType,
  documentTypeParams,
  getDocumentTypesQuery,
} = require("../Validations/DocumentTypes.schema");

// Define routes for CRUD operations with camelCase
router.post(
  "/api/documentTypes",
  verifyTokenOfAxios,
  validator(createDocumentType),
  checkDocumentTypeExists,
  documentTypesController.createDocumentType,
);
router.get(
  "/api/documentTypes",
  verifyTokenOfAxios,
  verifyAdminsIdentity,
  validator(getDocumentTypesQuery, "query"),
  documentTypesController.getAllDocumentTypes,
);
router.put(
  "/api/documentTypes/:documentTypeUniqueId",
  verifyTokenOfAxios,
  verifyAdminsIdentity,
  validator(documentTypeParams, "params"),
  validator(updateDocumentType),
  documentTypesController.updateDocumentType,
);
router.delete(
  "/api/documentTypes/:documentTypeUniqueId",
  verifyTokenOfAxios,
  verifyAdminsIdentity,
  validator(documentTypeParams, "params"),
  documentTypesController.deleteDocumentType,
);

module.exports = router;
