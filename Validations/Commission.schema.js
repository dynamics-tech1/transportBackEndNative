const Joi = require("joi");
const { uuidSchema } = require("../Middleware/Validator");

exports.createCommission = Joi.object({
  journeyDecisionUniqueId: uuidSchema.messages({
    "string.guid": "journeyDecisionUniqueId must be a valid UUID",
    "any.required": "journeyDecisionUniqueId is required",
  }),

  commissionRateUniqueId: uuidSchema.messages({
    "string.guid": "commissionRateUniqueId must be a valid UUID",
    "any.required": "commissionRateUniqueId is required",
  }),

  commissionAmount: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .required()
    .messages({
      "number.base": "commissionAmount must be a number",
      "number.positive": "commissionAmount must be positive",
      "number.max": "commissionAmount cannot exceed 999,999.99",
      "any.required": "commissionAmount is required",
    }),

  commissionStatusUniqueId: uuidSchema.optional().messages({
    "string.guid": "commissionStatusUniqueId must be a valid UUID"
  }),
}).strict(); // Disallow unknown fields

exports.updateCommission = Joi.object({
  journeyDecisionUniqueId: uuidSchema.optional(),
  commissionRateUniqueId: uuidSchema.optional(),
  commissionAmount: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .optional(),
  commissionStatusUniqueId: uuidSchema.optional(),
})
  .min(1)
  .strict(); // At least one field to update

exports.getAllCommissions = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string()
    .valid(
      "commissionId",
      "commissionAmount",
      "paymentTime",
      "driverName",
      "passengerName",
      "commissionStatus"
    )
    .default("commissionId"),
  sortOrder: Joi.string().valid("ASC", "DESC", "asc", "desc").default("DESC"),
  commissionAmountMin: Joi.number().min(0),
  commissionAmountMax: Joi.number().min(0),
  paymentUniqueId: uuidSchema.optional(),
  commissionRateUniqueId: uuidSchema.optional(),
  driverName: Joi.string().max(100),
  driverPhone: Joi.string().max(20),
  driverEmail: Joi.string().email().max(100),
  driverUniqueId: uuidSchema.optional(),
  passengerName: Joi.string().max(100),
  passengerPhone: Joi.string().max(20),
  passengerEmail: Joi.string().email().max(100),
  passengerUniqueId: uuidSchema.optional(),
  commissionStatusUniqueId: uuidSchema.optional(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref("startDate")),
}).with("endDate", "startDate"); // If endDate provided, startDate is required

exports.commissionIdSchema = Joi.object({
  id: uuidSchema.required().messages({
    "string.guid": "Invalid Commission ID format",
    "any.required": "Commission ID is required",
  }),
});
