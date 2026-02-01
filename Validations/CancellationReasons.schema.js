const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createCancellationReason = Joi.object({
  cancellationReason: Joi.string().required(),
  roleId: Joi.number().integer().required(),
}).unknown(true);

exports.updateCancellationReason = Joi.object({
  cancellationReason: Joi.string().optional(),
  roleId: Joi.number().integer().optional(),
}).unknown(true);

exports.cancellationReasonParams = Joi.object({
  cancellationReasonTypeUniqueId: uuidSchema.required(),
});

exports.getCancellationReasonsQuery = Joi.object({
  cancellationReasonTypeUniqueId: uuidSchema.optional(),
  cancellationReason: Joi.string().optional().allow(""),
  roleId: Joi.number().integer().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
}).unknown(true);
