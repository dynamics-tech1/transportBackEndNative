const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

// Driver request expects a nested currentLocation, not flat originLatitude/originLongitude
const locationSchema = Joi.object({
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  description: Joi.string().required(),
}).required();

exports.createRequest = Joi.object({
  currentLocation: locationSchema,
  journeyStatusId: Joi.number().integer().optional(), // optional override
}).unknown(true);

exports.takeFromStreet = Joi.object({
  // fields
}).unknown(true);

exports.requestIdParams = Joi.object({
  driverRequestUniqueId: uuidSchema.required(),
});

exports.cancelRequestQuery = Joi.object({
  //
}).unknown(true);

exports.getCancellationNotificationsQuery = Joi.object({
  seenStatus: Joi.string()
    .valid("no need to see it", "not seen by driver yet", "seen by driver")
    .optional(),
}).unknown(true);

exports.markCancellationAsSeen = Joi.object({
  driverRequestUniqueId: uuidSchema.required(),
}).unknown(false);

exports.markRejectionAsSeen = Joi.object({
  driverRequestUniqueId: uuidSchema.required(),
}).unknown(false);

exports.markNotSelectionInBidAsSeen = Joi.object({
  driverRequestUniqueId: uuidSchema.required(),
}).unknown(false);

exports.markNegativeStatusAsSeen = Joi.object({
  driverRequestUniqueId: uuidSchema.required(),
}).unknown(false);

// Verify driver status - no query parameters required (uses authenticated user's userUniqueId from token)
// Allows unknown query parameters for flexibility, but validates none are required
exports.verifyDriverStatus = Joi.object({}).unknown(true);

exports.acceptPassengerRequest = Joi.object({
  driverRequestUniqueId: uuidSchema,
  passengerRequestUniqueId: uuidSchema,
  journeyDecisionUniqueId: uuidSchema,
  shippingCostByDriver: Joi.number().min(0).required(),
}).unknown(false);

// Send updated driver location to passenger
exports.sendUpdatedLocation = Joi.object({
  journeyDecisionUniqueId: uuidSchema.required().messages({
    "any.required": "journeyDecisionUniqueId is required",
    "string.guid": "journeyDecisionUniqueId must be a valid UUID",
  }),
  latitude: Joi.number().min(-90).max(90).required().messages({
    "any.required": "latitude is required",
    "number.min": "latitude must be between -90 and 90",
    "number.max": "latitude must be between -90 and 90",
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    "any.required": "longitude is required",
    "number.min": "longitude must be between -180 and 180",
    "number.max": "longitude must be between -180 and 180",
  }),
  passengerPhone: Joi.string().optional(), // Optional - will be fetched from journey data if not provided
  additionalData: Joi.object().optional(), // Any additional data to include in notification
}).unknown(false);

// Complete journey - driver marks journey as completed
exports.completeJourney = Joi.object({
  journeyDecisionUniqueId: uuidSchema.required().messages({
    "any.required": "journeyDecisionUniqueId is required",
    "string.guid": "journeyDecisionUniqueId must be a valid UUID",
  }),
  passengerRequestUniqueId: uuidSchema.required().messages({
    "any.required": "passengerRequestUniqueId is required",
    "string.guid": "passengerRequestUniqueId must be a valid UUID",
  }),
  driverRequestUniqueId: uuidSchema.required().messages({
    "any.required": "driverRequestUniqueId is required",
    "string.guid": "driverRequestUniqueId must be a valid UUID",
  }),
  journeyUniqueId: uuidSchema.required().messages({
    "any.required": "journeyUniqueId is required",
    "string.guid": "journeyUniqueId must be a valid UUID",
  }),
  latitude: Joi.number().min(-90).max(90).required().messages({
    "any.required": "latitude is required",
    "number.min": "latitude must be between -90 and 90",
    "number.max": "latitude must be between -90 and 90",
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    "any.required": "longitude is required",
    "number.min": "longitude must be between -180 and 180",
    "number.max": "longitude must be between -180 and 180",
  }),
  paymentMethodUniqueId: uuidSchema.optional().messages({
    "string.guid": "paymentMethodUniqueId must be a valid UUID",
  }),
  vehicleTypeUniqueId: uuidSchema.optional().messages({
    "string.guid": "vehicleTypeUniqueId must be a valid UUID",
  }),
}).unknown(true); // Allow additional fields like location data

// Start journey - driver begins journey with current location
exports.startJourney = Joi.object({
  driverRequestUniqueId: uuidSchema.required().messages({
    "any.required": "driverRequestUniqueId is required",
    "string.guid": "driverRequestUniqueId must be a valid UUID",
  }),
  passengerRequestUniqueId: uuidSchema.required().messages({
    "any.required": "passengerRequestUniqueId is required",
    "string.guid": "passengerRequestUniqueId must be a valid UUID",
  }),
  journeyDecisionUniqueId: uuidSchema.required().messages({
    "any.required": "journeyDecisionUniqueId is required",
    "string.guid": "journeyDecisionUniqueId must be a valid UUID",
  }),
  latitude: Joi.number().min(-90).max(90).required().messages({
    "any.required": "latitude is required",
    "number.min": "latitude must be between -90 and 90",
    "number.max": "latitude must be between -90 and 90",
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    "any.required": "longitude is required",
    "number.min": "longitude must be between -180 and 180",
    "number.max": "longitude must be between -180 and 180",
  }),
}).unknown(true); // Allow additional fields
