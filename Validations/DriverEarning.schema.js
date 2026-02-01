const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.driverEarningQuery = Joi.object({
  driverUniqueId: Joi.alternatives()
    .try(Joi.string().valid("self"), uuidSchema)
    .required(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional(),
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(10),
}).unknown(true);
