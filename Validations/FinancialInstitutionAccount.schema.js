const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createAccount = Joi.object({
  institutionName: Joi.string().required(),
  accountNumber: Joi.string().required(),
  accountHolderName: Joi.string().required(),
}).unknown(true);

exports.updateAccount = Joi.object({
  institutionName: Joi.string().optional(),
  accountNumber: Joi.string().optional(),
  accountHolderName: Joi.string().optional(),
}).unknown(true);

exports.accountParams = Joi.object({
  accountUniqueId: uuidSchema.required(),
});

exports.getAccountsQuery = Joi.object({
  // Possibly filter by user
  userUniqueId: uuidSchema.optional(),
}).unknown(true);
