const ServerResponder = require("../Utils/ServerResponder");
const AppError = require("../Utils/AppError");
const {
  upsertDeviceToken,
  getDeviceTokenByUniqueId,
  updateDeviceTokenByUniqueId,
  deleteDeviceTokenByUniqueId,
  sendNotificationToTokens,
  sendFCMNotificationToUser,
} = require("../Services/Firebase.service");

const firebaseController = {
  // POST /api/user/updateFCMToken
  createFirebase: async (req, res, next) => {
    try {
      const userUniqueId = req?.user?.userUniqueId || null; // from verifyTokenOfAxios
      const roleId = req?.user?.roleId || null;
      const { FCMToken, platform, appVersion, locale } = req.body || {};
      const result = await upsertDeviceToken({
        userUniqueId,
        token: FCMToken,
        platform,
        appVersion,
        locale,
        roleId,
      });
      return ServerResponder(res, result);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/user/updateFCMToken/:id (deviceTokenUniqueId)
  getFirebaseById: async (req, res, next) => {
    try {
      const { deviceTokenUniqueId } = req.params;
      const result = await getDeviceTokenByUniqueId(deviceTokenUniqueId);
      return ServerResponder(res, result);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/user/updateFCMToken/:id
  updateFirebase: async (req, res, next) => {
    try {
      const { deviceTokenUniqueId } = req.params;
      const {
        platform = null,
        appVersion = null,
        locale = null,
        revoke = undefined,
      } = req.body || {};

      const result = await updateDeviceTokenByUniqueId(deviceTokenUniqueId, {
        platform,
        appVersion,
        locale,
        revokedAt: revoke, // pass true to revoke, false to un-revoke
      });
      return ServerResponder(res, result);
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/user/updateFCMToken/:id
  deleteFirebase: async (req, res, next) => {
    try {
      const { deviceTokenUniqueId } = req.params;
      const result = await deleteDeviceTokenByUniqueId(deviceTokenUniqueId);
      return ServerResponder(res, result);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/notifications/send-to-user
  sendFCMNotificationToUser: async (req, res, next) => {
    try {
      const { roleId } = req?.user || {};
      const { userUniqueId, notification, data, android, apns, webpush } =
        req.body || {};

      if (!userUniqueId) {
        return next(new AppError("userUniqueId required", 400));
      }
      if (!roleId) {
        return next(new AppError("roleId required", 400));
      }
      // notification must contain title and body
      if (!notification?.title || !notification?.body) {
        return next(
          new AppError("notification must contain title and body", 400),
        );
      }
      const result = await sendFCMNotificationToUser({
        userUniqueId,
        roleId,
        notification,
        data,
        android,
        apns,
        webpush,
      });
      return ServerResponder(res, result);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/notifications/send-to-tokens
  sendNotificationToTokens: async (req, res, next) => {
    try {
      const { tokens, notification, data, android, apns, webpush } =
        req.body || {};
      const result = await sendNotificationToTokens({
        tokens,
        notification,
        data,
        android,
        apns,
        webpush,
      });
      return ServerResponder(res, result);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = firebaseController;
