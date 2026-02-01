const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createDepositSource = Joi.object({
  sourceName: Joi.string().required(),
  description: Joi.string().optional(),
}).unknown(true);

exports.updateDepositSource = Joi.object({
  sourceName: Joi.string().optional(),
  description: Joi.string().optional(),
}).unknown(true);

exports.depositSourceParams = Joi.object({
  depositSourceUniqueId: uuidSchema.required(),
});
