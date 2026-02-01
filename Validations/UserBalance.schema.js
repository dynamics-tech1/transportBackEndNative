const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createUserBalance = Joi.object({
  amount: Joi.number().required(),
  driverUniqueId: uuidSchema.required(),
  // ...
}).unknown(true);

exports.balanceParams = Joi.object({
  userBalanceUniqueId: uuidSchema.required(),
});

exports.userBalanceFilter = Joi.object({
  // query params
}).unknown(true);

exports.lastBalanceParams = Joi.object({
  driverUniqueId: Joi.string().required(),
  fromDate: Joi.string().optional(),
  toDate: Joi.string().optional(),
  length: Joi.string().optional(),
});
