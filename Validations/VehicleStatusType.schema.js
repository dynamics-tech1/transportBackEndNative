const Joi = require("joi");

exports.createVehicleStatusType = Joi.object({
  typeName: Joi.string().required(),
  description: Joi.string().optional().allow(""),
}).unknown(true);

exports.updateVehicleStatusType = Joi.object({
  typeName: Joi.string().optional(),
  description: Joi.string().optional().allow(""),
}).unknown(true);

exports.vehicleStatusTypeParams = Joi.object({
  id: Joi.number().integer().required(),
});
