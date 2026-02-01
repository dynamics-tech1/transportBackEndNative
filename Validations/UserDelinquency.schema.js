const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createUserDelinquency = Joi.object({
  userUniqueId: uuidSchema.required(),
  delinquencyTypeUniqueId: uuidSchema.required(),
  roleId: Joi.number().required(),
  delinquencyDescription: Joi.string().optional(),
  journeyDecisionUniqueId: uuidSchema.optional(),
  isDeliquencySeenByAdmin: Joi.boolean().optional(),
  // others
}).unknown(true);

exports.userDelinquencyParams = Joi.object({
  userDelinquencyUniqueId: uuidSchema.required(),
});

exports.userRoleParams = Joi.object({
  userRoleUniqueId: uuidSchema.required(),
});
