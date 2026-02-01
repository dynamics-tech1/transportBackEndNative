const Joi = require("joi");
const { usersRoles } = require("../Utils/ListOfSeedData");
 
// Helper schemas
const phoneNumberSchema = Joi.string()
  .pattern(/^\+?[0-9\s-]{10,20}$/)
  .messages({ "string.pattern.base": "Invalid phone number format" });
const emailSchema = Joi.string().email().optional();
const OTPSchema = Joi.alternatives()
  .try(
    Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/),
    Joi.number().integer(),
  )
  .required();

exports.createUser = Joi.object({
  phoneNumber: phoneNumberSchema.required(),
  // register only 1 shipper/passengerDocumentRequirement and 2 driver
  roleId: Joi.number().integer().valid(usersRoles.passengerRoleId, usersRoles.driverRoleId).required(),
  statusId: Joi.number().integer().default(1), // Default to 1 (active status) if not provided
  fullName: Joi.string().optional(),
  email: emailSchema,
  userRoleStatusDescription: Joi.string().optional(),
  requestedFrom: Joi.string().optional(),
  // Add other fields as necessary from User.service.js
}).unknown(true); // Allow unknown for now as User creation might have many fields

exports.createUserByAdmin = Joi.object({
  fullName: Joi.string().required(),
  email: emailSchema,
  phoneNumber: phoneNumberSchema.required(),
  roleId: Joi.number().integer().valid(usersRoles.passengerRoleId, usersRoles.driverRoleId, usersRoles.vehicleOwnerRoleId, usersRoles.adminRoleId).required(),
  // ... other fields
}).unknown(true);

exports.loginUser = Joi.object({
  phoneNumber: phoneNumberSchema.required(),
  roleId: Joi.number().integer().valid(usersRoles.passengerRoleId, usersRoles.driverRoleId, usersRoles.adminRoleId, usersRoles.supperAdminRoleId, usersRoles.vehicleOwnerRoleId, usersRoles.systemRoleId).required(),
});

exports.verifyUserByOTP = Joi.object({
  phoneNumber: phoneNumberSchema.required(),
  OTP: OTPSchema,
  roleId: Joi.number().integer().valid(usersRoles.passengerRoleId, usersRoles.driverRoleId, usersRoles.adminRoleId, usersRoles.supperAdminRoleId, usersRoles.vehicleOwnerRoleId, usersRoles.systemRoleId).optional(),
}).unknown(true); // might have firebase tokens etc

exports.updateUser = Joi.object({
  // Allows updating fields
  fullName: Joi.string().optional(),
  email: emailSchema,
  phoneNumber: phoneNumberSchema.optional(),
  // ...
}).unknown(true);

exports.userIdParams = Joi.object({
  userUniqueId: Joi.string().required(), // Might accept 'self' or UUID
});

exports.ownerUserIdParams = Joi.object({
  ownerUserUniqueId: Joi.string().required(),
});

exports.getUserFilter = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().allow(""),
  userUniqueId: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
  email: Joi.string().optional(),
  fullName: Joi.string().optional(),
  roleId: Joi.number().integer().valid(1, 2).optional(),
  roleUniqueId: Joi.string().optional(),
  statusId: Joi.number().integer().optional(),
  // Date filters
  createdAt: Joi.alternatives().try(Joi.date(), Joi.object()),
}).unknown(true);
