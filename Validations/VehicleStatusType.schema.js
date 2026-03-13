const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createVehicleStatusType = Joi.object({
  typeName: Joi.string().required(),
  description: Joi.string().optional().allow(""),
}).unknown(true);

exports.updateVehicleStatusType = Joi.object({
  typeName: Joi.string().optional(),
  description: Joi.string().optional().allow(""),
}).unknown(true);

exports.vehicleStatusTypeParams = Joi.object({
  vehicleStatusTypeUniqueId: uuidSchema.required(),
});

exports.vehicleStatusTypeQuery = Joi.object({
  vehicleStatusTypeUniqueId: uuidSchema.optional(),
  typeName: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
}).unknown(true);
