const canceledJourneyService = require("../Services/CanceledJourneys.service");
const { cancelPassengerRequest } = require("../Services/PassengerRequest");
const {
  sendSocketIONotificationToPassenger,
} = require("../Utils/Notifications");
const ServerResponder = require("../Utils/ServerResponder");
const messageTypes = require("../Utils/MessageTypes");
const { pool } = require("../Middleware/Database.config");
const AppError = require("../Utils/AppError");

// Helper function to handle service responses
const handleServiceResponse = async (serviceCall, res, next) => {
  try {
    const result = await serviceCall;
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// System cancellation process
const cancelJourneyBySystem = async (req, res, next) => {
  try {
    const now = currentDate();
    const cutoffTime = new Date(now.getTime() - 5 * 60 * 1000);

    const sqlQuery = `
      SELECT PassengerRequest.*, Users.phoneNumber
      FROM PassengerRequest
      JOIN Users ON Users.userUniqueId = PassengerRequest.userUniqueId
      WHERE PassengerRequest.journeyStatusId = 1
        AND PassengerRequest.shipperRequestCreatedAt <= ?
    `;

    const [activeRequests] = await pool.query(sqlQuery, [cutoffTime]);

    for (const request of activeRequests) {
      await cancelPassengerRequest({
        ownerUserUniqueId: request.userUniqueId,
        cancellationReasonsTypeId: 1,
      });

      await sendSocketIONotificationToPassenger({
        phoneNumber: request.phoneNumber,
        message: {
          message: "success",
          status: null,
          driver: null,
          passenger: null,
          messageTypes: messageTypes.request_other_driver,
        },
      });
    }

    ServerResponder(res, {
      success: true,
      message: "System cancellation process completed",
      data: { processed: activeRequests.length },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new canceled journey
const createCanceledJourney = async (req, res, next) => {
  const user = req.user;
  const data = {
    ...req.body,
    userUniqueId: user.userUniqueId,
    roleId: user.roleId,
  };

  await handleServiceResponse(
    canceledJourneyService.createCanceledJourney(data),
    res,
    next,
  );
};

// UNIFIED GET ENDPOINT - Handles all filtering scenarios
const getCanceledJourneyByFilter = async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const user = req.user;

  // Build filter data from query parameters
  const filters = {
    ...req.query,
    page: parseInt(page),
    limit: parseInt(limit),
  };

  // Handle "self" user reference
  if (filters.userUniqueId === "self") {
    filters.userUniqueId = user.userUniqueId;
  }

  await handleServiceResponse(
    canceledJourneyService.getCanceledJourneyByFilter(filters),
    res,
    next,
  );
};

// Update seen by admin status
const updateSeenByAdmin = async (req, res, next) => {
  const { canceledJourneyUniqueId } = req.params;

  await handleServiceResponse(
    canceledJourneyService.updateSeenByAdmin(canceledJourneyUniqueId),
    res,
    next,
  );
};

// Update a canceled journey
const updateCanceledJourney = async (req, res, next) => {
  const { canceledJourneyUniqueId } = req.params;
  const data = req.body;

  await handleServiceResponse(
    canceledJourneyService.updateCanceledJourney(canceledJourneyUniqueId, data),
    res,
    next,
  );
};

// Delete a canceled journey
const deleteCanceledJourney = async (req, res, next) => {
  const { canceledJourneyUniqueId } = req.params;

  await handleServiceResponse(
    canceledJourneyService.deleteCanceledJourney(canceledJourneyUniqueId),
    res,
    next,
  );
};

const getCanceledJourneyCountsByDate = async (req, res, next) => {
  try {
    const fromDate = req?.query?.fromDate;
    const toDate = req?.query?.toDate;

    const userRoleId = req?.user?.roleId;

    // Validate required parameters
    if (!fromDate || !toDate) {
      return next(new AppError("fromDate and toDate are required", 400));
    }

    let ownerUserUniqueId = req?.query?.ownerUserUniqueId || "all";

    // Authorization check: only allow admin (3) or super admin (6) to access all data
    if (ownerUserUniqueId === "all") {
      const isAdmin = userRoleId === 3 || userRoleId === 6;
      if (!isAdmin) {
        // Non-admin users can only see their own data
        ownerUserUniqueId = req?.user?.userUniqueId;
      }
    }

    if (ownerUserUniqueId === "self") {
      ownerUserUniqueId = req?.user?.userUniqueId;
    }

    // Build filters object matching your reference structure
    const filters = {
      ownerUserUniqueId,
      toDate,
      fromDate,
      userFilters: {
        fullName: req?.query?.fullName,
        phone: req?.query?.phone,
        email: req?.query?.email,
        search: req?.query?.search,
      },
    };

    await handleServiceResponse(
      canceledJourneyService.getCanceledJourneyCountsByDate(filters),
      res,
      next,
    );
  } catch (error) {
    next(error);
  }
};

const getCanceledJourneyCountsByReason = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      roleId,
      contextType,
      groupBy,
      includeEmptyReasons,
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return next(new AppError("startDate and endDate are required", 400));
    }

    const filters = {
      startDate,
      endDate,
      roleId: roleId ? parseInt(roleId) : null,
      contextType,
      groupBy: groupBy || "reason",
      includeEmptyReasons: includeEmptyReasons === "true",
    };

    const result =
      await canceledJourneyService.getCanceledJourneyCountsByReason(filters);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const unbanUser = async (req, res, next) => {
  const user = req?.user;

  await handleServiceResponse(
    canceledJourneyService.unbanUser(req.query, user),
    res,
    next,
  );
};

const deactivateBan = async (req, res, next) => {
  const { banUniqueId } = req.params;

  await handleServiceResponse(
    canceledJourneyService.deactivateBan(banUniqueId),
    res,
    next,
  );
};

module.exports = {
  getCanceledJourneyCountsByReason,
  getCanceledJourneyCountsByDate,
  getCanceledJourneyByFilter,
  updateSeenByAdmin,
  cancelJourneyBySystem,
  deleteCanceledJourney,
  updateCanceledJourney,
  createCanceledJourney,
  unbanUser,
  deactivateBan,
};
