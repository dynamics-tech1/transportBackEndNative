const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createVehicleStatus = Joi.object({
  vehicleUniqueId: uuidSchema.required(),
  statusTypeId: Joi.number().integer().required(),
  remark: Joi.string().optional().allow(""),
}).unknown(true);

exports.updateVehicleStatus = Joi.object({
  statusTypeId: Joi.number().integer().optional(),
  remark: Joi.string().optional().allow(""),
}).unknown(true);

exports.vehicleStatusParams = Joi.object({
  id: Joi.alternatives().try(uuidSchema, Joi.number()).required(),
});
