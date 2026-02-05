const express = require("express");
const router = express.Router();
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const AccountController = require("../Controllers/Account.controller");
const { validator } = require("../Middleware/Validator");
const { accountStatusParams } = require("../Validations/Account.schema");

/**
 * @fileoverview Account Management Routes
 *
 * This module defines routes for account-related operations including
 * comprehensive user status evaluation.
 */

/**
 * GET /api/account/status
 * @description Comprehensive account status evaluation endpoint
 *
 * Evaluates a user's account status based on multiple criteria:
 * - Ban status
 * - Vehicle registration (for drivers/vehicle owners)
 * - Document verification status
 * - Subscription status (for drivers)
 *
 * The endpoint supports flexible user identification and returns
 * detailed status information with priority-based status determination.
 *
 * @route GET /api/account/status
 * @middleware verifyTokenOfAxios - Requires authentication token
 * @param {string} [query.ownerUserUniqueId] - Direct user ID lookup
 * @param {string} [query.phoneNumber] - User lookup by phone number (URL-encoded)
 * @param {string} [query.email] - User lookup by email address
 * @param {number} query.roleId - Required: Role ID (1=Passenger, 2=Driver, 3=Admin)
 * @param {boolean} [query.enableDocumentChecks=true] - Whether to check document requirements
 * @returns {Object} Account status with user data, vehicle info, documents, and final status
 * @example
 * GET /api/account/status?phoneNumber=%2B251911234567&roleId=2
 *
 * Response:
 * {
 *   "message": "success",
 *   "vehicle": {...},
 *   "userData": {...},
 *   "attachedDocumentsByStatus": {...},
 *   "subscription": {...},
 *   "status": 1,
 *   "reason": "All requirements satisfied"
 * }
 *
 * Status Codes:
 * - 1: Active (all requirements met)
 * - 2: Inactive - No vehicle registered
 * - 3: Inactive - Required documents missing
 * - 4: Inactive - Documents rejected
 * - 5: Inactive - Documents pending review
 * - 6: Inactive - User banned
 * - 7: Inactive - No active subscription (drivers only)
 */
router.get(
  "/api/account/status",
  verifyTokenOfAxios,
  validator(accountStatusParams, "query"),
  AccountController?.accountStatus,
);

module.exports = router;
