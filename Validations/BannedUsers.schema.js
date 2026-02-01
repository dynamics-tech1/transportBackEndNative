const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.banUser = Joi.object({
  userRoleUniqueId: uuidSchema.required(),
  reason: Joi.string().required(),
  banDuration: Joi.number().min(0).optional(), // Assuming minutes/hours/days? Or indefinite
  // Check controller or service for exact fields
}).unknown(true);

exports.updateBan = Joi.object({
  reason: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
}).unknown(true);

exports.banParams = Joi.object({
  banUniqueId: uuidSchema.required(),
});

exports.getBannedUsersQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  userRoleUniqueId: uuidSchema.optional(),
  banUniqueId: uuidSchema.optional(),
  // and other filters
}).unknown(true);
