const ServerResponder = require("../Utils/ServerResponder");
const AccountService = require("../Services/Account.service");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");

/**
 * @fileoverview Account Controller
 *
 * Handles account-related HTTP requests including user status evaluation.
 * Acts as the interface between HTTP layer and business logic services.
 */

/**
 * GET /api/account/status - Account Status Controller
 * @description Controller for comprehensive account status evaluation
 *
 * Processes account status requests by resolving user identification,
 * delegating to the service layer for evaluation, and returning formatted responses.
 * Supports flexible user lookup by ID, phone, or email.
 *
 * User Resolution Priority:
 * 1. ownerUserUniqueId (if provided)
 * 2. phoneNumber + email (resolves user in service)
 * 3. authenticated user (fallback)
 *
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user from JWT token
 * @param {Object} req.validatedQuery - Validated query parameters from middleware
 * @param {string} [req.validatedQuery.ownerUserUniqueId] - Direct user ID
 * @param {string} [req.validatedQuery.phoneNumber] - Phone number for user lookup
 * @param {string} [req.validatedQuery.email] - Email for user lookup
 * @param {number} req.validatedQuery.roleId - Required role ID
 * @param {boolean} [req.validatedQuery.enableDocumentChecks] - Document check flag
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response with account status
 *
 * @throws {AppError} When user resolution fails or service errors occur
 *
 * @example
 * // Phone lookup for driver status
 * GET /api/account/status?phoneNumber=%2B251911234567&roleId=2
 *
 * @example
 * // Self status check
 * GET /api/account/status?roleId=1
 *
 * @example
 * // Direct user ID lookup
 * GET /api/account/status?ownerUserUniqueId=uuid-here&roleId=2
 */
const accountStatus = async (req, res, next) => {
  try {
    // Extract validated parameters from middleware-updated req.query
    let user = req?.user;
    const userUniqueId = user?.userUniqueId;
    let ownerUserUniqueId = req?.query?.ownerUserUniqueId;
    const phoneNumber = req?.query?.phoneNumber;
    const email = req?.query?.email;
    let enableDocumentChecks = req?.query?.enableDocumentChecks;

    // Priority: ownerUserUniqueId > phoneNumber > email > self
    if (!ownerUserUniqueId || ownerUserUniqueId === "self") {
      if (phoneNumber || email) {
        // Will be resolved in service by phone/email
        ownerUserUniqueId = null;
        user = null;
      } else {
        ownerUserUniqueId = userUniqueId;
        req.roleId = user?.roleId;
      }
    } else {
      user = null;
    }

    const result = await executeInTransaction(async (connection) => {
      return await AccountService?.accountStatus({
        ownerUserUniqueId,
        phoneNumber,
        email,
        user,
        body: req?.query || {},
        enableDocumentChecks,
        connection, // Pass connection for transaction support
      });
    });

    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  accountStatus,
};
