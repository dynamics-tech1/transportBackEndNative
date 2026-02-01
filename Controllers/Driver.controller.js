const services = require("../Services/DriverRequest");
const { journeyStatusMap } = require("../Utils/ListOfSeedData");

const ServerResponder = require("../Utils/ServerResponder");
const AppError = require("../Utils/AppError");

const createRequest = async (req, res, next) => {
  try {
    const userUniqueId = req?.user?.userUniqueId;
    if (!userUniqueId) {
      throw new AppError("User not authenticated", 401);
    }
    req.body.userUniqueId = userUniqueId;
    const result = await services.createRequest({ body: req.body });
    ServerResponder(res, result, 201);
  } catch (error) {
    next(error);
  }
};
const takeFromStreet = async (req, res, next) => {
  try {
    const user = req.user;
    const shipperRequestCreatedBy = user?.userUniqueId;
    const shipperRequestCreatedByRoleId = user?.roleId;
    req.body.shipperRequestCreatedBy = shipperRequestCreatedBy;
    req.body.shipperRequestCreatedByRoleId = shipperRequestCreatedByRoleId;

    const result = await services.takeFromStreet({ ...req.body }, req.user);
    ServerResponder(res, result, 201);
  } catch (error) {
    next(error);
  }
};
const createAndAcceptNewRequest = async (req, res, next) => {
  try {
    const { userUniqueId } = req?.user;
    req.body.userUniqueId = userUniqueId;
    const result = await services.createAndAcceptNewRequest(req.body);
    ServerResponder(res, result, 201);
  } catch (error) {
    next(error);
  }
};
// Get a specific driver request by ID

const acceptPassengerRequest = async (req, res, next) => {
  try {
    const { userUniqueId } = req?.user;
    req.body.userUniqueId = userUniqueId;
    req.body.journeyStatusId = journeyStatusMap.acceptedByDriver;
    const result = await services.acceptPassengerRequest(req.body);
    ServerResponder(res, result, 200);
  } catch (error) {
    next(error);
  }
};

const deleteRequestController = async (req, res, next) => {
  try {
    const { driverRequestUniqueId } = req.params;
    const { userUniqueId } = req?.user;

    if (!driverRequestUniqueId) {
      throw new AppError("Driver request unique ID is required", 400);
    }

    if (!userUniqueId) {
      throw new AppError("User not authenticated", 401);
    }

    const result = await services.deleteDriverRequest({
      driverRequestUniqueId,
      deletedBy: userUniqueId,
    });

    ServerResponder(res, result, 200);
  } catch (error) {
    next(error);
  }
};

const verifyDriverStatusController = async (req, res, next) => {
  try {
    const { userUniqueId } = req?.user;
    const result = await services.verifyDriverStatus({
      userUniqueId,
    });

    ServerResponder(res, result, 200);
  } catch (error) {
    next(error);
  }
};

const getDriverRequestController = async (req, res, next) => {
  try {
    const { userUniqueId } = req?.user || {};
    const {
      driverUserUniqueId,
      target = "all",
      page = 1,
      limit = 10,
      journeyStatusIds,
      startDate,
      endDate,
      originPlace,
      username,
      email,
      phoneNumber,
      sortBy,
      sortOrder,
    } = req.query;

    let filters = {};
    if (journeyStatusIds) {
      const journeyStatusIdsArray = journeyStatusIds.split(",");
      if (journeyStatusIdsArray.length === 1) {
        filters.journeyStatusId = journeyStatusIdsArray[0];
      } else {
        filters.journeyStatusIds = journeyStatusIdsArray;
      }
    }

    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }
    if (originPlace) {
      filters.originPlace = originPlace;
    }
    if (username) {
      filters.username = username;
    }
    if (email) {
      filters.email = email;
    }
    if (phoneNumber) {
      filters.phoneNumber = phoneNumber;
    }
    if (sortBy) {
      filters.sortBy = sortBy;
    }
    if (sortOrder) {
      filters.sortOrder = sortOrder;
    }

    const data = {
      userUniqueId:
        driverUserUniqueId === "self" ? userUniqueId : driverUserUniqueId,
      target,
      page: parseInt(page),
      limit: parseInt(limit),
      filters,
    };

    const result = await services.getDriverRequest({ data });
    ServerResponder(res, result, 200);
  } catch (error) {
    next(error);
  }
};

const startJourney = async (req, res, next) => {
  try {
    const { userUniqueId } = req?.user;
    req.body.journeyStatusId = journeyStatusMap.journeyStarted;
    req.body.previousStatusId = journeyStatusMap.acceptedByPassenger;
    req.body.userUniqueId = userUniqueId;
    const result = await services.startJourney(req.body);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
const noAnswerFromDriver = async (req, res, next) => {
  try {
    const { userUniqueId } = req?.user;
    req.body.userUniqueId = userUniqueId;
    req.body.journeyStatusId = journeyStatusMap.noAnswerFromDriver;
    req.body.previousStatusId = journeyStatusMap.requested;
    const result = await services.noAnswerFromDriver(req.body);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
const completeJourney = async (req, res, next) => {
  try {
    const { userUniqueId, roleId } = req?.user;
    req.body.userUniqueId = userUniqueId;
    req.body.roleId = roleId;
    req.body.journeyStatusId = journeyStatusMap.journeyCompleted;
    req.body.previousStatusId = journeyStatusMap.journeyStarted;

    const result = await services.completeJourney(req.body);

    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
const cancelDriverRequest = async (req, res, next) => {
  try {
    const user = req?.user;
    const userUniqueId = user?.userUniqueId;
    let ownerUserUniqueId = req.query.userUniqueId;
    const roleId = req.query.roleId;
    if (ownerUserUniqueId === "self" || !ownerUserUniqueId) {
      ownerUserUniqueId = userUniqueId;
    }
    req.query.ownerUserUniqueId = ownerUserUniqueId;
    req.query.user = user;
    req.query.roleId = roleId;
    const result = await services.cancelDriverRequest({
      ...req.query,
    });

    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
const sendUpdatedLocationController = async (req, res, next) => {
  try {
    const { userUniqueId } = req?.user;
    req.body.userUniqueId = userUniqueId;
    const result = await services.sendUpdatedLocation(req.body);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const getCancellationNotificationsController = async (req, res, next) => {
  try {
    const { userUniqueId } = req?.user;
    const { seenStatus } = req.query;

    if (!userUniqueId) {
      throw new AppError("Missing user information", 400);
    }

    const result = await services.getCancellationNotifications({
      userUniqueId,
      seenStatus,
    });

    ServerResponder(res, result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Unified controller to mark any negative status as seen by driver
 * Handles: notSelectedInBid, rejectedByPassenger, cancelledByPassenger, cancelledByAdmin, cancelledBySystem
 */
const markNegativeStatusAsSeenController = async (req, res, next) => {
  try {
    const { userUniqueId } = req?.user;
    const { driverRequestUniqueId } = req.body;

    if (!userUniqueId || !driverRequestUniqueId) {
      throw new AppError("Missing required fields", 400);
    }

    const result = await services.markNegativeStatusAsSeenByDriver({
      driverRequestUniqueId,
      userUniqueId,
    });

    ServerResponder(res, result, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendUpdatedLocationController,
  createAndAcceptNewRequest,
  cancelDriverRequest,
  completeJourney,
  noAnswerFromDriver,
  startJourney,
  createRequest,
  acceptPassengerRequest,
  deleteRequestController,
  takeFromStreet,
  verifyDriverStatusController,
  getDriverRequestController,
  getCancellationNotificationsController,
  markNegativeStatusAsSeenController,
};
