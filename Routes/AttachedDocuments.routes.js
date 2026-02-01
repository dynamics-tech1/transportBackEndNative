const express = require("express");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/"); // Specify where the files will be stored
//   },
//   filename: function (req, file, cb) {
//     const userId = req.user.userId;
//     const randomNumber = Math.floor(Math.random() * 10000000000);
//     const uniqueName =
//       userId +
//       "_" +
//       randomNumber +
//       "_" +
//       currentDate() +
//       "-" +
//       path.extname(file.originalname); // Unique filename with extension
//     cb(null, uniqueName); // Use uniqueName as the final filename
//   },
// });

const router = express.Router();
const { verifyAdminsIdentity } = require("../Middleware/VerifyUsersIdentity");
const attachedDocumentsController = require("../Controllers/AttachedDocuments.controller");
const multer = require("multer");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const checkDuplicateDocuments = require("../Middleware/CheckDuplicateDocuments");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Define routes for handling multiple file uploads
const { validator } = require("../Middleware/Validator");
const {
  getAttachedDocumentsQuery,
  attachedDocumentParams,
  userParams,
  acceptRejectDocs,
} = require("../Validations/AttachedDocuments.schema");

// Define routes for handling multiple file uploads
router.post(
  "/api/user/attachDocuments/:userUniqueId",
  verifyTokenOfAxios,
  validator(userParams, "params"), // Validate params first
  upload.any(), // File upload - parse files and form fields
  checkDuplicateDocuments, // Check for duplicates after parsing but before processing
  // Body validation might be tricky with dynamic fields from multers
  attachedDocumentsController.createAttachedDocuments,
);

// Single consolidated filter endpoint for ALL document retrieval
router.get(
  "/api/user/attachedDocuments",
  verifyTokenOfAxios,
  validator(getAttachedDocumentsQuery, "query"),
  attachedDocumentsController.getAttachedDocumentsByFilter,
);

router.put(
  "/api/user/attachedDocuments/:attachedDocumentUniqueId",
  verifyTokenOfAxios,
  validator(attachedDocumentParams, "params"), // Validate params first
  upload.any(), // File upload - parse files and form fields
  attachedDocumentsController.updateAttachedDocument,
);

router.delete(
  "/api/user/attachedDocuments/:attachedDocumentUniqueId",
  verifyTokenOfAxios,
  validator(attachedDocumentParams, "params"),
  attachedDocumentsController.deleteAttachedDocument,
);

router.put(
  "/api/admin/acceptRejectAttachedDocuments",
  verifyTokenOfAxios,
  verifyAdminsIdentity,
  validator(acceptRejectDocs),
  attachedDocumentsController.acceptRejectAttachedDocuments,
);

module.exports = router;
