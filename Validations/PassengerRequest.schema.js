const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

// Nested location schema expected by createNewPassengerRequest
const locationSchema = Joi.object({
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  description: Joi.string().required(),
}).required();

exports.createPassengerRequest = Joi.object({
  passengerRequestBatchId: uuidSchema.required(),
  numberOfVehicles: Joi.number().integer().min(1).default(1),
  shippingDate: Joi.date().iso().required(),
  deliveryDate: Joi.date().iso().required(),
  shippingCost: Joi.number().required(),
  shippableItemQtyInQuintal: Joi.number().required(),
  shippableItemName: Joi.string().required(),
  shipperPhoneNumber: Joi.string().optional(), // required only when admin creates on behalf
  requestType: Joi.string().valid("PASSENGER", "CARGO").optional(),

  // Nested objects used by service
  originLocation: locationSchema,
  destination: locationSchema,
  vehicle: Joi.object({
    vehicleTypeUniqueId: uuidSchema.required(),
  }).required(),
}).unknown(true); // keep allowing additional fields

exports.requestParams = Joi.object({
  id: uuidSchema.required(),
}).unknown(true); // 'id' in routes probably map to passengerRequestUniqueId or similar

exports.passengerRequestQuery = Joi.object({
  // define query params
}).unknown(true);

exports.cancelRequestParams = Joi.object({
  userUniqueId: Joi.alternatives()
    .try(uuidSchema, Joi.string().valid("self"))
    .required(),
});

exports.cancelPassengerRequestBody = Joi.object({
  passengerRequestUniqueId: uuidSchema.required(),
  cancellationReasonsTypeId: Joi.number().integer().optional(),
}).unknown(true);

exports.getCancellationNotificationsQuery = Joi.object({
  seenStatus: Joi.string()
    .valid(
      "no need to see it",
      "not seen by passenger yet",
      "seen by passenger"
    )
    .optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
}).unknown(true);

exports.markCancellationAsSeen = Joi.object({
  journeyDecisionUniqueId: uuidSchema.required(),
}).unknown(false);

exports.markJourneyCompletionAsSeen = Joi.object({
  journeyDecisionUniqueId: uuidSchema.required(),
  passengerRequestUniqueId: uuidSchema.required(),
  rating: Joi.number().integer().min(1).max(5).required(),
}).unknown(true); // Allow additional fields for future extensibility

exports.verifyPassengerStatusQuery = Joi.object({
  pageSize: Joi.number().integer().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
}).unknown(true);
