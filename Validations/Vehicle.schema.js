const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

// Create vehicle payload (matches Vehicle.service expectations)
exports.createVehicle = Joi.object({
  vehicleTypeUniqueId: uuidSchema.required(),
  licensePlate: Joi.string().required(),
  color: Joi.string().required(),
  isDriverOwnerOfVehicle: Joi.boolean().optional(),
  // keep unknown for any additional fields
}).unknown(true);

exports.updateVehicle = Joi.object({
  vehicleTypeId: Joi.alternatives().try(uuidSchema, Joi.number()).optional(),
  colorId: Joi.alternatives().try(uuidSchema, Joi.number()).optional(),
  vehicleModel: Joi.string().optional(),
  vehicleYear: Joi.number().integer().min(1900).optional(),
  vehicleLicensePlate: Joi.string().optional(),
}).unknown(true);

exports.vehicleParams = Joi.object({
  vehicleUniqueId: uuidSchema.optional(),
  driverUserUniqueId: Joi.alternatives()
    .try(uuidSchema, Joi.string().valid("self"))
    .optional(), // create route uses this; allow "self"
}).unknown(true); // Allow other params

// Filter schema for vehicles
exports.getVehiclesQuery = Joi.object({
  driverUserUniqueId: uuidSchema.optional(),
  vehicleUniqueId: uuidSchema.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  // Add other filters if supported by controller
}).unknown(true);
