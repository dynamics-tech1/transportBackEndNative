const Joi = require("joi");

exports.createUserStatus = Joi.object({
  userStatusName: Joi.string().required(),
}).unknown(true);

exports.updateUserStatus = Joi.object({
  userStatusName: Joi.string().optional(),
}).unknown(true);

exports.userStatusParams = Joi.object({
  id: Joi.alternatives().try(Joi.number().integer(), Joi.string()).required(),
});
