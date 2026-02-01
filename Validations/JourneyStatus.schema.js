const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

const nullTokenSchema = Joi.string().valid("null", "notNull");

exports.createJourneyStatus = Joi.object({
  journeyStatusName: Joi.string().required(),
  journeyStatusDescription: Joi.string().optional().allow(""),
}).unknown(true);

exports.updateJourneyStatus = Joi.object({
  journeyStatusName: Joi.string().optional(),
  journeyStatusDescription: Joi.string().optional().allow(""),
}).unknown(true);

exports.journeyStatusParams = Joi.object({
  journeyStatusUniqueId: uuidSchema.required(),
});

exports.getJourneyStatusQuery = Joi.object({
  journeyStatusUniqueId: uuidSchema.optional(),
  journeyStatusName: Joi.string().optional().allow(""),
  journeyStatusDescription: Joi.string().optional().allow(""),
  journeyStatusCreatedAt: Joi.date().iso().optional(),
  journeyStatusDeletedAt: Joi.alternatives()
    .try(Joi.date().iso(), nullTokenSchema)
    .optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(100).optional(),
}).unknown(true);
