const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createVehicleOwnership = Joi.object({
  vehicleUniqueId: uuidSchema.required(),
  ownerUserUniqueId: uuidSchema.required(),
  // Check fields
}).unknown(true);

exports.updateVehicleOwnership = Joi.object({
  status: Joi.number().integer().optional(),
}).unknown(true);

exports.ownershipParams = Joi.object({
  ownershipId: Joi.alternatives().try(uuidSchema, Joi.number()).required(),
});
