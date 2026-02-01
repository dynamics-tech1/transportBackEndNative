const Joi = require("joi");

exports.createCommissionStatus = Joi.object({
  statusName: Joi.string().max(50).required(),
  description: Joi.string().max(255).optional(),
  effectiveFrom: Joi.date().iso().optional(),
  effectiveTo: Joi.date().iso().min(Joi.ref("effectiveFrom")).optional(),
}).strict();

exports.updateCommissionStatus = Joi.object({
  statusName: Joi.string().max(50).optional(),
  description: Joi.string().max(255).optional(),
  effectiveFrom: Joi.date().iso().optional(),
  effectiveTo: Joi.date().iso().min(Joi.ref("effectiveFrom")).optional(),
})
  .min(1)
  .strict();

exports.getAllCommissionStatuses = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string()
    .valid("statusName", "createdAt", "active")
    .default("statusName"),
  sortOrder: Joi.string().valid("ASC", "DESC", "asc", "desc").default("ASC"),
  statusName: Joi.string().optional(),
  active: Joi.boolean().optional(), // Filter by effective dates
}).strict();
