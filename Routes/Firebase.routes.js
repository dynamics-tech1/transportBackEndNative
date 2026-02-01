// Firebase routes
const express = require("express");
const router = express.Router();
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const firebaseController = require("../Controllers/Firebase.controller");

// Define routes for CRUD operations
const { validator } = require("../Middleware/Validator");
const {
  upsertFCMToken,
  updateFCMToken,
  firebaseParams,
  sendNotification,
} = require("../Validations/Firebase.schema");

// Define routes for CRUD operations
router.post(
  "/api/user/upsertFCMToken",
  verifyTokenOfAxios,
  validator(upsertFCMToken),
  firebaseController.createFirebase,
);
router.get(
  "/api/user/getFCMToken/:deviceTokenUniqueId",
  verifyTokenOfAxios,
  validator(firebaseParams, "params"),
  firebaseController.getFirebaseById,
);
router.put(
  "/api/user/updateFCMToken/:deviceTokenUniqueId",
  verifyTokenOfAxios,
  validator(firebaseParams, "params"),
  validator(updateFCMToken),
  firebaseController.updateFirebase,
);
router.delete(
  "/api/user/deleteFCMToken/:deviceTokenUniqueId",
  verifyTokenOfAxios,
  validator(firebaseParams, "params"),
  firebaseController.deleteFirebase,
);

// Notification sending endpoints
router.post(
  "/api/notifications/send-to-user",
  verifyTokenOfAxios,
  validator(sendNotification),
  firebaseController.sendFCMNotificationToUser,
);
router.post(
  "/api/notifications/send-to-tokens",
  verifyTokenOfAxios,
  validator(sendNotification),
  firebaseController.sendNotificationToTokens,
);

module.exports = router;
