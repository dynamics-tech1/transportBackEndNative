const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createDepositSource = Joi.object({
  sourceKey: Joi.string().required(),
  sourceLabel: Joi.string().required(),
}).unknown(true);

exports.updateDepositSource = Joi.object({
  sourceKey: Joi.string().optional(),
  sourceLabel: Joi.string().optional(),
}).unknown(true);

exports.depositSourceParams = Joi.object({
  depositSourceUniqueId: uuidSchema.required(),
});
