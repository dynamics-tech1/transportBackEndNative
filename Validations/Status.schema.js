const Joi = require("joi");
// Status IDs are likely integers (e.g., 1 for Active, 0 for Inactive)

exports.createStatus = Joi.object({
  statusName: Joi.string().required(),
  statusDescription: Joi.string().optional().allow(""),
  description: Joi.string().optional().allow(""),
}).unknown(true);

exports.updateStatus = Joi.object({
  statusName: Joi.string().optional(),
  statusDescription: Joi.string().optional().allow(""),
}).unknown(true);

exports.statusParams = Joi.object({
  //valid uuid format
  statusUniqueId: Joi.string()
    .pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .required(),
});

exports.getStatusesQuery = Joi.object({
  statusUniqueId: Joi.string()
    .pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().allow(""),
}).unknown(true);
