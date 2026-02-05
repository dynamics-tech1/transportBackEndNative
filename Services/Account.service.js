const { getVehicleDrivers } = require("./VehicleDriver.service");
const {
  updateUserRoleStatus,
  getUserRoleStatusCurrent,
} = require("./UserRoleStatus.service");
const {
  getRoleDocumentRequirements,
} = require("./RoleDocumentRequirements.service");
const { getUserByFilterDetailed } = require("./User.service");
const logger = require("../Utils/logger");
const { pool } = require("../Middleware/Database.config");
const { usersRoles } = require("../Utils/ListOfSeedData");
const {
  getUserSubscriptionsWithFilters,
  createUserSubscription,
  getSubscriptionData,
} = require("./UserSubscription.service");
const AppError = require("../Utils/AppError");

/**
 * Validates parameters for accountStatus function
 * @param {Object} params - Parameters to validate
 * @throws {AppError} If validation fails
 */
const validateAccountStatusParams = ({
  ownerUserUniqueId,
  phoneNumber,
  email,
  user,
  body,
  enableDocumentChecks,
  connection,
}) => {
  // Check if at least one user identifier is provided
  const hasUserIdentifier =
    ownerUserUniqueId || phoneNumber || email || user?.userUniqueId;
  if (!hasUserIdentifier) {
    throw new AppError(
      "At least one user identifier is required: ownerUserUniqueId, phoneNumber, email, or user.userUniqueId",
      400,
    );
  }

  // Validate ownerUserUniqueId if provided (not null/undefined)
  if (
    ownerUserUniqueId !== undefined &&
    ownerUserUniqueId !== null &&
    (typeof ownerUserUniqueId !== "string" || ownerUserUniqueId.trim() === "")
  ) {
    throw new AppError("ownerUserUniqueId must be a non-empty string", 400);
  }

  // If ownerUserUniqueId is not provided, require phoneNumber or email
  if (!ownerUserUniqueId && !phoneNumber && !email) {
    throw new AppError(
      "Either ownerUserUniqueId, phoneNumber, or email must be provided to identify the user",
      400,
    );
  }

  // Validate phoneNumber if provided
  if (
    phoneNumber !== undefined &&
    (typeof phoneNumber !== "string" || phoneNumber.trim() === "")
  ) {
    throw new AppError("phoneNumber must be a non-empty string", 400);
  }

  // Validate email if provided
  if (email !== undefined) {
    if (typeof email !== "string" || email.trim() === "") {
      throw new AppError("email must be a non-empty string", 400);
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError("email must be a valid email address", 400);
    }
  }

  // Validate user object if provided (allow null for phone/email lookups)
  if (user !== undefined && user !== null) {
    if (typeof user !== "object") {
      throw new AppError("user must be an object", 400);
    }
    if (
      user.userUniqueId &&
      (typeof user.userUniqueId !== "string" || user.userUniqueId.trim() === "")
    ) {
      throw new AppError("user.userUniqueId must be a non-empty string", 400);
    }
  }

  // Validate that roleId is available (from body or user)
  const hasRoleId = (body && body.roleId) || (user && user.roleId);
  if (!hasRoleId) {
    throw new AppError(
      "roleId is required and must be provided in body.roleId or user.roleId",
      400,
    );
  }

  // Validate enableDocumentChecks
  if (typeof enableDocumentChecks !== "boolean") {
    throw new AppError("enableDocumentChecks must be a boolean", 400);
  }

  // Validate connection if provided
  if (connection !== undefined) {
    if (
      typeof connection !== "object" ||
      connection === null ||
      typeof connection.query !== "function"
    ) {
      throw new AppError(
        "connection must be a valid database connection object with a query method",
        400,
      );
    }
  }
};

/**
 * Consolidated account status check for a user (documents, vehicle, ban, subscription)
 * @param {Object} params - Parameters object
 * @param {string} [params.ownerUserUniqueId] - Unique ID of the user whose account status is being checked
 * @param {string} [params.phoneNumber] - Phone number to search for user (alternative to ownerUserUniqueId)
 * @param {string} [params.email] - Email to search for user (alternative to ownerUserUniqueId)
 * @param {Object} [params.user] - Authenticated user object (if checking own status)
 * @param {Object} [params.body] - Request body containing roleId and other optional parameters
 * @param {boolean} [params.enableDocumentChecks=true] - Whether to check document requirements
 * @returns {Promise<Object>} Response object with account status, vehicle info, documents, subscription, and final status
 * @example
 * const result = await accountStatus({
 *   ownerUserUniqueId: "uuid-here",
 *   body: { roleId: 2 },
 *   enableDocumentChecks: true
 * });
 */
const accountStatus = async ({
  ownerUserUniqueId,
  phoneNumber,
  email,
  user,
  body,
  enableDocumentChecks = true,
  connection, // Optional: use existing connection if provided
}) => {
  // ========== PARAMETER VALIDATION ==========
  validateAccountStatusParams({
    ownerUserUniqueId,
    phoneNumber,
    email,
    user,
    body,
    enableDocumentChecks,
    connection,
  });

  // --- Initialize state for all checks ---
  let userVehicle = null;
  let banData = null;
  let subscriptionInfo = {
    hasActiveSubscription: false,
    subscriptionType: "none",
    subscriptionDetails: null,
  };
  let attachedDocumentsByStatus = { PENDING: [], ACCEPTED: [], REJECTED: [] };
  let unAttachedDocumentTypes = [];
  let requiredDocuments = [];

  try {
    // ========== STEP 0: RESOLVE USER CONTEXT ==========
    let effectiveUser = user;
    let resolvedUserUniqueId = ownerUserUniqueId;
    const requestedRoleId = body?.roleId; // Get roleId from query if provided

    // If ownerUserUniqueId is not provided, try to resolve by phone or email
    if (!resolvedUserUniqueId && (phoneNumber || email)) {
      // First, find the user by phone/email WITHOUT roleId filter
      // (roleId filter would exclude users who don't have that role)
      // We use limit=1 because for account status we only need one specific user
      // If multiple users match (e.g., partial phone number), we take the first match
      const userFilters = {};
      if (phoneNumber) {
        userFilters.phoneNumber = phoneNumber;
      }
      if (email) {
        userFilters.email = email;
      }
      // Don't include roleId here - we'll check it separately

      const userResult = await getUserByFilterDetailed(userFilters, 1, 1);
      if (
        userResult?.message === "success" &&
        userResult?.data?.[0]?.user?.userUniqueId
      ) {
        resolvedUserUniqueId = userResult.data[0].user.userUniqueId;
        // Now get full user role status for the resolved user with roleId filter if provided
        const userDataParams = { userUniqueId: resolvedUserUniqueId };
        if (requestedRoleId) {
          userDataParams.roleId = requestedRoleId;
        }

        const userData = await getUserRoleStatusCurrent({
          data: userDataParams,
        });
        effectiveUser = userData?.data?.[0];

        // If roleId was requested but user doesn't have that role, return error
        if (requestedRoleId && !effectiveUser) {
          throw new AppError(
            `User found but does not have role ID ${requestedRoleId}`,
            404,
          );
        }
      } else {
        // User not found by phone/email
        throw new AppError(
          "User not found with the provided phone number or email",
          404,
        );
      }
    } else if (
      !effectiveUser ||
      (resolvedUserUniqueId && resolvedUserUniqueId !== user?.userUniqueId)
    ) {
      // Resolve by ownerUserUniqueId if provided
      const userDataParams = { userUniqueId: resolvedUserUniqueId };
      if (requestedRoleId) {
        userDataParams.roleId = requestedRoleId;
      }

      const userData = await getUserRoleStatusCurrent({
        data: userDataParams,
      });
      effectiveUser = userData?.data?.[0];
    }

    if (!effectiveUser) {
      throw new AppError("User not found", 404);
    }

    // Update resolvedUserUniqueId from effectiveUser if not already set
    if (!resolvedUserUniqueId && effectiveUser?.userUniqueId) {
      resolvedUserUniqueId = effectiveUser.userUniqueId;
    }

    const roleId = effectiveUser?.roleId ?? requestedRoleId;
    const effectivePhoneNumber = effectiveUser?.phoneNumber || phoneNumber;
    const userRoleStatusDescription = body?.userRoleStatusDescription;

    if (!roleId) {
      throw new AppError("Role ID is required", 400);
    }

    // ========== STEP 1: FETCH USER ROLE STATUS (Once) ==========
    // Use userUniqueId directly if available, otherwise use phoneNumber for search
    const userRoleStatusParams = { roleId };
    if (resolvedUserUniqueId) {
      userRoleStatusParams.userUniqueId = resolvedUserUniqueId;
    } else if (effectivePhoneNumber) {
      userRoleStatusParams.search = effectivePhoneNumber;
    }

    const userRoleStatus = await getUserRoleStatusCurrent({
      data: userRoleStatusParams,
    });

    if (!userRoleStatus || userRoleStatus?.data?.length === 0) {
      throw new AppError("User role status not found", 404);
    }

    const { userRoleStatusUniqueId, userRoleId, statusId } =
      userRoleStatus.data[0];

    // ========== STEP 2: PARALLELIZE ALL INDEPENDENT CHECKS ==========
    const requiresVehicle = [
      usersRoles.driverRoleId,
      usersRoles.vehicleOwnerRoleId,
    ].includes(Number(roleId));

    const [banCheck, vehicleCheck, requiredDocsResult, subscriptionCheck] =
      await Promise.allSettled([
        // 1. Ban Check
        (async () => {
          try {
            const bannedUsersService = require("./BannedUsers.service");
            return await bannedUsersService.getBannedUsers({
              search: effectivePhoneNumber,
              roleId,
            });
          } catch (e) {
            logger.error("Error checking banned users", {
              error: e.message,
              stack: e.stack,
            });
            return null;
          }
        })(),

        // 2. Vehicle Check
        requiresVehicle
          ? getVehicleDrivers({
              driverUserUniqueId: resolvedUserUniqueId,
              assignmentStatus: "active",
              limit: 1,
              page: 1,
            })
          : Promise.resolve({ data: [] }),

        // 3. Document Requirements List
        enableDocumentChecks
          ? getRoleDocumentRequirements({
              roleId,
              page: 1,
              limit: 1000,
              sortBy: "documentTypeId",
              sortOrder: "ASC",
            })
          : Promise.resolve({ data: [] }),

        // 4. Subscription Check (Drivers Only)
        Number(roleId) === usersRoles.driverRoleId
          ? checkAndGrantUserSubscription(resolvedUserUniqueId)
          : Promise.resolve(null),
      ]);

    // --- Process Ban Check Result ---
    if (banCheck.status === "fulfilled" && banCheck.value?.data) {
      banData = banCheck.value.data;
    }

    // --- Process Vehicle Check Result ---
    const Vehicle =
      vehicleCheck.status === "fulfilled" ? vehicleCheck.value?.data || [] : [];
    if (Vehicle.length > 0) {
      userVehicle = Vehicle[0];
    }

    // --- Process Document Requirements & Status ---
    if (enableDocumentChecks && requiredDocsResult.status === "fulfilled") {
      requiredDocuments = requiredDocsResult.value?.data || [];
      if (requiredDocuments.length > 0) {
        const sql = `
          SELECT
            ad.*,
            dt.*,
            rdr.*,
            CASE
              WHEN ad.attachedDocumentId IS NULL THEN 'NOT_ATTACHED'
              ELSE ad.attachedDocumentAcceptance
            END as doc_status
          FROM RoleDocumentRequirements rdr
          JOIN DocumentTypes dt ON rdr.documentTypeId = dt.documentTypeId
          LEFT JOIN AttachedDocuments ad ON ad.documentTypeId = dt.documentTypeId
            AND ad.userUniqueId = ?
            AND ad.attachedDocumentAcceptance != 'DELETED'
          WHERE rdr.roleId = ?
          ORDER BY dt.documentTypeId
        `;
        const [allDocs] = await (connection || pool).query(sql, [
          resolvedUserUniqueId,
          roleId,
        ]);
        allDocs.forEach((doc) => {
          if (doc.doc_status === "NOT_ATTACHED") {
            unAttachedDocumentTypes.push(doc);
          } else if (attachedDocumentsByStatus[doc.doc_status]) {
            attachedDocumentsByStatus[doc.doc_status].push(doc);
          }
        });
      }
    }

    // --- Process Subscription Check Result ---
    if (subscriptionCheck.status === "fulfilled" && subscriptionCheck.value) {
      subscriptionInfo = subscriptionCheck.value;
    }

    // ========== STEP 3: DETERMINE FINAL STATUS BASED ON PRIORITY ==========
    let finalStatusId = 1; // Default: Active
    let reason = "All requirements satisfied";

    // Priority 1: Banned (6)
    if (banData?.isBanned) {
      finalStatusId = 6;
      reason = "User is banned";
    }
    // Priority 2: No Vehicle (2)
    else if (requiresVehicle && !userVehicle) {
      finalStatusId = 2;
      reason = "No vehicle registered for this role";
    }
    // Priority 3: Document Rejected (4)
    else if (attachedDocumentsByStatus.REJECTED.length > 0) {
      finalStatusId = 4;
      reason = "One or more documents have been rejected";
    }
    // Priority 4: Documents Missing (3)
    else if (unAttachedDocumentTypes.length > 0) {
      finalStatusId = 3;
      reason = "Some required documents are not attached";
    }
    // Priority 5: Documents Pending (5)
    else if (attachedDocumentsByStatus.PENDING.length > 0) {
      finalStatusId = 5;
      reason = "One or more documents are pending review";
    }
    // Priority 6: No Subscription (7)
    else if (
      Number(roleId) === usersRoles.driverRoleId &&
      !subscriptionInfo.hasActiveSubscription
    ) {
      finalStatusId = 7;
      reason = "Driver doesn't have an active subscription";
    }

    // ========== STEP 4: UPDATE STATUS IF CHANGED ==========
    if (statusId !== finalStatusId) {
      await updateUserRoleStatus({
        user: effectiveUser,
        roleId,
        userRoleStatusUniqueId,
        userRoleId,
        newStatusId: finalStatusId,
        userRoleStatusDescription,
        phoneNumber: effectivePhoneNumber,
      });
    }

    // Get latest user data using userUniqueId directly for accuracy
    const latestUserDataParams = { roleId };
    if (resolvedUserUniqueId) {
      latestUserDataParams.userUniqueId = resolvedUserUniqueId;
    } else if (effectivePhoneNumber) {
      latestUserDataParams.search = effectivePhoneNumber;
    }

    const latestUserData = await getUserRoleStatusCurrent({
      data: latestUserDataParams,
    });
    console.log("@latestUserData", latestUserData);
    return {
      message: "success",
      messageType: "accountStatus",
      vehicle: userVehicle,
      userData: latestUserData?.data?.[0] || null,
      attachedDocumentsByStatus,
      unAttachedDocumentTypes,
      requiredDocuments,
      subscription: subscriptionInfo,
      status: finalStatusId,
      reason,
      banData: banData?.isBanned ? banData.banDetails : null,
    };
  } catch (error) {
    logger.error("Error in accountStatus evaluation", {
      error: error.message,
      stack: error.stack,
      params: {
        ownerUserUniqueId,
        phoneNumber,
        email,
        user: user
          ? { userUniqueId: user.userUniqueId, roleId: user.roleId }
          : null,
        body,
      },
    });
    throw new AppError(
      `An error occurred during account status evaluation: ${error.message}`,
      500,
    );
  }
};

// ========== OPTIMIZED SUBSCRIPTION HELPER ==========
async function checkAndGrantUserSubscription(driverUniqueId) {
  try {
    let wasGranted = false;
    // return { driverUniqueId };
    // 1. Check for unassigned free plans (limit to 1)
    const unassignedFreePlans = await getSubscriptionData({
      dataType: "freePlans",
      driverUniqueId,
      page: 1,
      limit: 1,
    });
    // 2. Grant if found (but only one at a time)
    if (unassignedFreePlans?.data?.length > 0) {
      const plan = unassignedFreePlans.data[0];
      await createUserSubscription({
        driverUniqueId,
        subscriptionPlanPricingUniqueId: plan.subscriptionPlanPricingUniqueId,
        userSubscriptionCreatedBy: driverUniqueId,
      });
      wasGranted = true;
    }

    // 3. Check active subscriptions (single query)
    const activeSubscriptions = await getUserSubscriptionsWithFilters({
      driverUniqueId,
      isActive: true,
    });

    if (activeSubscriptions?.data?.length > 0) {
      const subscription = activeSubscriptions.data;
      return {
        hasActiveSubscription: true,
        subscriptionType: subscription.isFree ? "free" : "paid",
        subscriptionDetails: subscription,
        wasRecentlyGranted: wasGranted,
      };
    }

    return {
      hasActiveSubscription: false,
      subscriptionType: "none",
      subscriptionDetails: null,
      wasRecentlyGranted: wasGranted,
    };
  } catch (error) {
    logger.error("Error checking driver subscription", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError("Failed to check subscription status", 500);
  }
}

module.exports = {
  accountStatus,
};
