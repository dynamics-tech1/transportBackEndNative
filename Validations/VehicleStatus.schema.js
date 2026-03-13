const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createVehicleStatus = Joi.object({
  vehicleUniqueId: uuidSchema.required(),
  VehicleStatusTypeId: Joi.number().integer().required(),
}).unknown(true);

exports.updateVehicleStatus = Joi.object({
  VehicleStatusTypeId: Joi.number().integer().optional(),
}).unknown(true);

exports.vehicleStatusParams = Joi.object({
  vehicleStatusUniqueId: uuidSchema.required(),
});

exports.vehicleStatusQuery = Joi.object({
  vehicleStatusUniqueId: uuidSchema.optional(),
  vehicleUniqueId: uuidSchema.optional(),
  VehicleStatusTypeId: Joi.number().integer().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
}).unknown(true);
