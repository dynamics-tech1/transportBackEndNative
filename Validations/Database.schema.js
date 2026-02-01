const Joi = require("joi");
 
exports.createTable = Joi.object({
  tableName: Joi.string().required().pattern(/^[a-zA-Z0-9_]+$/),
  columns: Joi.array().items(Joi.object()).required(),
}).unknown(true);

exports.updateTable = Joi.object({
  action: Joi.string().valid("ADD", "DROP", "ALTER").optional(),
  columnName: Joi.string().optional(),
  columnDefinition: Joi.string().optional(),
}).unknown(true);

exports.tableParams = Joi.object({
  tableName: Joi.string().required(),
  columnName: Joi.string().optional(),
}).unknown(true);

exports.installDataQuery = Joi.object({
  // Possibly confirmation or force flag
  force: Joi.boolean().optional(),
}).unknown(true);
