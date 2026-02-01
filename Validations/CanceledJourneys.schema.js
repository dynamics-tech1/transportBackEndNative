const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createCanceledJourney = Joi.object({
  journeyUniqueId: uuidSchema.required(),
  cancellationReasonsTypeUniqueId: uuidSchema.optional(), // or cancellationReasonsTypeId based on usage
  reason: Joi.string().optional().allow(""),
  // Check controller for other fields
}).unknown(true);

exports.cancelJourneyBySystem = Joi.object({
  journeyUniqueId: uuidSchema.required(),
  reason: Joi.string().required(),
}).unknown(true);

exports.updateCanceledJourney = Joi.object({
  reason: Joi.string().optional().allow(""),
  seenByAdmin: Joi.boolean().optional(),
}).unknown(true);

exports.canceledJourneyParams = Joi.object({
  canceledJourneyUniqueId: uuidSchema.required(),
});

exports.getCanceledJourneyQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  roleId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  isSeenByAdmin: Joi.boolean().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
  search: Joi.string().optional().allow(""),
  userUniqueId: uuidSchema.optional(),
}).unknown(true);
