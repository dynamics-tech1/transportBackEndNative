const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createJourneyRoutePoint = Joi.object({
  // Controller/service expect journeyDecisionUniqueId, not journeyUniqueId
  journeyDecisionUniqueId: uuidSchema.required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  userUniqueId: Joi.alternatives()
    .try(uuidSchema, Joi.string().valid("self"))
    .optional(),
  sequenceOrder: Joi.number().integer().optional(),
}).unknown(true);

exports.updateJourneyRoutePoint = Joi.object({
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
}).unknown(true);

exports.journeyRoutePointParams = Joi.object({
  pointId: Joi.alternatives().try(uuidSchema, Joi.number()).required(),
}).unknown(true);

exports.getJourneyRoutePointsQuery = Joi.object({
  // Controller reads req.query.journeyDecisionUniqueId
  journeyDecisionUniqueId: uuidSchema.required(),
}).unknown(true);
