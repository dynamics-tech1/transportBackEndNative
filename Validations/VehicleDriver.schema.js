const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createVehicleDriver = Joi.object({
  vehicleUniqueId: uuidSchema.required(),
  userUniqueId: uuidSchema.required(),
  status: Joi.number().integer().optional(),
}).unknown(true);

exports.updateVehicleDriver = Joi.object({
  vehicleUniqueId: uuidSchema.optional(),
  userUniqueId: uuidSchema.optional(),
  status: Joi.number().integer().optional(),
}).unknown(true);

exports.vehicleDriverQuery = Joi.object({
  vehicleUniqueId: uuidSchema.optional(),
  userUniqueId: uuidSchema.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
}).unknown(true);
