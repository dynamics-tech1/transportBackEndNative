const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.upsertFCMToken = Joi.object({
  token: Joi.string().optional(),
  FCMToken: Joi.string().optional(),
  deviceType: Joi.string().optional(),
  platform: Joi.string().optional(),
  appVersion: Joi.string().optional(),
  locale: Joi.string().optional(),
})
  .or("token", "FCMToken")
  .unknown(true);

exports.updateFCMToken = Joi.object({
  token: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
}).unknown(true);

exports.firebaseParams = Joi.object({
  deviceTokenUniqueId: uuidSchema.required(),
});

exports.sendNotification = Joi.object({
  title: Joi.string().required(),
  body: Joi.string().required(),
  data: Joi.object().optional(),
  // userUniqueId for send-to-user
  userUniqueId: uuidSchema.optional(), 
  // tokens for send-to-tokens
  tokens: Joi.array().items(Joi.string()).optional(),
}).unknown(true);
