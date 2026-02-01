const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createTariffRate = Joi.object({
  tariffRateName: Joi.string().required(),
  standingTariffRate: Joi.number().min(0).required(),
  journeyTariffRate: Joi.number().min(0).required(),
  timingTariffRate: Joi.number().min(0).required(),
  tariffRateEffectiveDate: Joi.date().required(),
  tariffRateExpirationDate: Joi.date().required(),
  tariffRateDescription: Joi.string().required(),
}).unknown(true);

exports.updateTariffRate = Joi.object({
  tariffRateName: Joi.string().optional(),
  standingTariffRate: Joi.number().min(0).optional(),
  journeyTariffRate: Joi.number().min(0).optional(),
  timingTariffRate: Joi.number().min(0).optional(),
  tariffRateEffectiveDate: Joi.date().optional(),
  tariffRateExpirationDate: Joi.date().optional(),
  tariffRateDescription: Joi.string().optional(),
}).unknown(true);

exports.tariffRateParams = Joi.object({
  tariffRateUniqueId: uuidSchema.optional(),
  id: uuidSchema.optional(),
}).xor("tariffRateUniqueId", "id");
