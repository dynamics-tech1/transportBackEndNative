const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createTariffRateForVehicle = Joi.object({
  vehicleTypeUniqueId: uuidSchema.required(),
  tariffRateUniqueId: uuidSchema.required(),
  status: Joi.number().integer().optional(),
}).unknown(true);

exports.updateTariffRateForVehicle = Joi.object({
  vehicleTypeUniqueId: uuidSchema.optional(),
  tariffRateUniqueId: uuidSchema.optional(),
  status: Joi.number().integer().optional(),
}).unknown(true);

exports.tariffRateForVehicleParams = Joi.object({
  tariffRateForVehicleTypeUniqueId: uuidSchema.optional(),
  id: uuidSchema.optional(),
}).xor("tariffRateForVehicleTypeUniqueId", "id");
