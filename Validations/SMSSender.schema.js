const Joi = require("joi");

exports.createSMSSender = Joi.object({
  senderName: Joi.string().required(),
  // Check other config fields
}).unknown(true);

exports.updateSMSSender = Joi.object({
  senderName: Joi.string().optional(),
}).unknown(true);

exports.smsSenderParams = Joi.object({
  id: Joi.number().integer().required(),
});
