const {
  getData,
  performJoinSelect,
  getAttachedDocumentsByUserUniqueIdAndDocumentTypeId,
  checkActivePassengerRequest,
  findNearbyDrivers,
} = require("../../CRUD/Read/ReadData");
const { updateData } = require("../../CRUD/Update/Data.update");
const { insertData } = require("../../CRUD/Create/CreateData");
const {
  sendSocketIONotificationToDriver,
  sendSocketIONotificationToPassenger,
} = require("../../Utils/Notifications");
const { getVehicleDrivers } = require("../VehicleDriver.service");
const {
  getJourneyDecision4AllOrSingleUser,
} = require("../JourneyDecisions.service");
const {
  journeyStatusMap,
  listOfDocumentsTypeAndId,
} = require("../../Utils/ListOfSeedData");
const messageTypes = require("../../Utils/MessageTypes");
const { v4: uuidv4 } = require("uuid");
const logger = require("../../Utils/logger");
const { currentDate } = require("../../Utils/CurrentDate");
const AppError = require("../../Utils/AppError");

/**
 * Gets the passenger's current journey status
 * @param {string} userUniqueId - Passenger's unique identifier
 * @returns {Promise<number|null>} Journey status ID or null
 */
const getPassengerJourneyStatus = async (userUniqueId) => {
  try {
    const [currentRequest] = await getData({
      tableName: "PassengerRequest",
      conditions: { userUniqueId },
      limit: 1,
      orderBy: "passengerRequestId",
      orderDirection: "desc",
    });

    const journeyStatusId = currentRequest?.journeyStatusId;
    return journeyStatusId && journeyStatusId <= journeyStatusMap.journeyStarted
      ? journeyStatusId
      : null;
  } catch (error) {
    const logger = require("../../Utils/logger");
    logger.error("Error getting current journey status", {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
};

/**
 * Gets recent completed journeys for a passenger
 * @param {Object} user - User object with userUniqueId
 * @returns {Promise<Object>} Recent completed journeys
 */
/**
 * Marks a journey as seen by passenger and creates a rating
 * @param {Object} body - Request body
 * @param {string} body.userUniqueId - Passenger's unique identifier
 * @param {string} body.passengerRequestUniqueId - Passenger request unique ID
 * @param {string} body.journeyDecisionUniqueId - Journey decision unique ID
 * @param {number} body.rating - Rating value
 * @returns {Promise<Object>} Success or error response
 */
const seenByPassenger = async (body) => {
  try {
    const {
      userUniqueId,
      passengerRequestUniqueId,
      journeyDecisionUniqueId,
      rating,
    } = body;

    // TODO: Import createRating once available
    const { createRating } = require("../Ratings.service");

    await Promise.all([
      updateData({
        tableName: "PassengerRequest",
        conditions: { passengerRequestUniqueId },
        updateValues: { isCompletionSeen: true },
      }),
      createRating({
        ratedBy: userUniqueId,
        journeyDecisionUniqueId: journeyDecisionUniqueId,
        rating,
        comment: "",
      }),
    ]);

    return { message: "success", data: "Data seen by passenger" };
  } catch (error) {
    const logger = require("../../Utils/logger");
    logger.error("Unable to mark data as seen by passenger", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError("Unable to seen by passenger", error.statusCode || 500);
  }
};

/**
 * Handles waiting request (status 1) - finds nearby drivers and creates journey decisions
 * @param {Object} params - Handler parameters
 * @param {Object} params.passengerRequest - Passenger request object
 * @param {number} params.passengerRequestId - Passenger request ID
 * @param {Object} params.totalRecords - Total records for pagination
 * @param {number} params.pageSize - Page size
 * @param {number} params.page - Page number
 * @param {Array} params.driversData - Array to push driver data (shared with handleNonWaitingRequest)
 * @param {Array} params.drivers - Array to push final drivers
 * @param {Array} params.decisions - Array to push final decisions
 * @param {Set} params.notifiedDrivers - Set to track notified drivers
 * @param {string} params.userUniqueId - User unique ID
 * @param {Object} params.connection - Database connection
 * @returns {Promise<boolean>} Returns true if driver was found
 */
async function handleWaitingRequest({
  passengerRequest,
  passengerRequestId,
  totalRecords,
  pageSize,
  page,
  driversData,
  drivers,
  decisions,
  notifiedDrivers,
  userUniqueId,
  connection,
}) {
  // Find available drivers near the passenger's location (READ-ONLY - outside transaction)
  const sql = `
    SELECT
      DriverRequest.*,
      Users.fullName,
      Users.phoneNumber,
      Users.email,
      Users.userUniqueId as driverUserUniqueId,
      Vehicle.vehicleUniqueId,
      Vehicle.licensePlate,
      Vehicle.color,
      VehicleTypes.vehicleTypeName,
      VehicleTypes.vehicleTypeUniqueId
    FROM DriverRequest
    JOIN Users ON DriverRequest.userUniqueId = Users.userUniqueId
    JOIN VehicleDriver vd ON vd.driverUserUniqueId = Users.userUniqueId
    JOIN Vehicle ON Vehicle.vehicleUniqueId = vd.vehicleUniqueId
    JOIN VehicleTypes ON Vehicle.vehicleTypeUniqueId = VehicleTypes.vehicleTypeUniqueId
    WHERE DriverRequest.journeyStatusId = ?
      AND VehicleTypes.vehicleTypeUniqueId = ?
    ORDER BY DriverRequest.driverRequestId ASC
    LIMIT 10
  `;

  const driverParams = [
    journeyStatusMap.waiting,
    passengerRequest.vehicleTypeUniqueId,
  ];

  const [driverResults] = await connection.query(sql, driverParams);

  if (driverResults.length === 0) {
    return false;
  }

  let driverFound = false;
  const decisionsData = [];
  const driversDataLocal = [];

  for (const driverResult of driverResults) {
    // Pre-fetch profile photo outside critical transaction (READ-ONLY)
    const documents = await getAttachedDocumentsByUserUniqueIdAndDocumentTypeId(
      driverResult.driverUserUniqueId,
      listOfDocumentsTypeAndId.profilePhoto,
      connection,
    );

    const data = documents?.data;
    const lastDataIndex = data?.length - 1;
    const driverProfilePhoto = data?.[lastDataIndex]?.attachedDocumentName;

    const driver = {
      ...driverResult,
      driverProfilePhoto,
    };

    const vehicle = {
      vehicleUniqueId: driverResult.vehicleUniqueId,
      licensePlate: driverResult.licensePlate,
      color: driverResult.color,
      vehicleTypeName: driverResult.vehicleTypeName,
      vehicleTypeUniqueId: driverResult.vehicleTypeUniqueId,
    };

    // CRITICAL TRANSACTION BLOCK - Only essential writes
    // Check if driver is still available (race condition protection)
    const availabilityCheck = await connection.query(
      `SELECT COUNT(*) as count FROM DriverRequest
       WHERE driverRequestId = ? AND journeyStatusId = ?`,
      [driverResult.driverRequestId, journeyStatusMap.waiting],
    );

    if (availabilityCheck[0][0].count === 0) {
      continue; // Driver no longer available, skip
    }

    // Create journey decision
    const journeyDecisionUniqueId = uuidv4();
    const journeyDecisionPayload = {
      journeyDecisionUniqueId,
      passengerRequestId,
      driverRequestId: driver.driverRequestId,
      journeyStatusId: journeyStatusMap.requested,
      decisionTime: currentDate(),
      decisionBy: "system",
      journeyDecisionCreatedBy: userUniqueId,
      journeyDecisionCreatedAt: currentDate(),
    };

    // Create journey decision with error handling for race conditions
    try {
      await insertData({
        tableName: "JourneyDecisions",
        colAndVal: journeyDecisionPayload,
        connection,
      });
    } catch (error) {
      // Handle duplicate key error (race condition)
      if (
        error.code === "ER_DUP_ENTRY" ||
        error.message?.includes("Duplicate entry") ||
        error.message?.includes("driverRequestId")
      ) {
        logger.warn(
          "Duplicate JourneyDecision detected (race condition), skipping",
          {
            driverRequestId: driver.driverRequestId,
            passengerRequestId: passengerRequestId,
            error: error.message,
          },
        );
        continue; // Skip this driver
      }
      throw error;
    }

    // Update passenger request status
    await updateData({
      tableName: "PassengerRequest",
      conditions: { passengerRequestId },
      updateValues: { journeyStatusId: journeyStatusMap.requested },
    });

    // Update driver request status
    await updateData({
      tableName: "DriverRequest",
      conditions: { driverRequestId: driver.driverRequestId },
      updateValues: { journeyStatusId: journeyStatusMap.requested },
    });
    // END CRITICAL TRANSACTION BLOCK

    // Collect data for notifications (outside transaction)
    driversDataLocal.push({
      driver: { ...driver, driverProfilePhoto },
      vehicle: vehicle,
    });

    decisionsData.push(journeyDecisionPayload);

    // Send notification (outside transaction)
    if (driver?.phoneNumber && !notifiedDrivers.has(driver.phoneNumber)) {
      await sendSocketIONotificationToDriver({
        message: {
          messageTypes: messageTypes.driver_found_shipper_request,
          message: "success",
          status: journeyStatusMap.requested,
          passenger: passengerRequest,
          driver: {
            driver: { ...driver, driverProfilePhoto },
            vehicle: vehicle,
          },
          journey: null,
          decisions: journeyDecisionPayload,
          totalRecords,
          pageSize,
          page,
        },
        phoneNumber: driver?.phoneNumber,
      });
      notifiedDrivers.add(driver.phoneNumber);
    }

    driverFound = true;
  }

  drivers.push(...driversDataLocal);
  decisions.push(...decisionsData);

  return driverFound;
}

/**
 * Handles non-waiting requests (status 2, 3, etc.) - fetches existing journey decisions and sends notifications
 * @param {Object} params - Handler parameters
 * @param {Object} params.passengerRequest - Passenger request object
 * @param {Object} params.totalRecords - Total records for pagination
 * @param {number} params.pageSize - Page size
 * @param {number} params.page - Page number
 * @param {Array} params.driversData - Array to push driver data
 * @param {Array} params.decisions - Array to push final decisions
 * @param {Set} params.notifiedDrivers - Set to track notified drivers
 * @param {Set} params.notifiedPassengersForAcceptance - Set to track passenger-driver acceptance notifications
 * @param {boolean} params.sendNotificationsToDrivers - Whether to send notifications to drivers
 * @param {boolean} params.sendNotificationsToPassenger - Whether to send notifications to passenger
 */
// Removed unused function: handleNonWaitingRequest
// eslint-disable-next-line no-unused-vars
const _handleNonWaitingRequest = async ({
  passengerRequest,
  totalRecords,
  pageSize,
  page,
  driversData,
  decisions,
  notifiedDrivers,
  notifiedPassengersForAcceptance,
  sendNotificationsToDrivers,
  sendNotificationsToPassenger,
}) => {
  const filters = {
    passengerRequestId: passengerRequest?.passengerRequestId,

    journeyStatusId: passengerRequest?.journeyStatusId,
  };
  // if  passengerRequest?.journeyStatusId, is 6 then get unseen by passenger completed journeys
  if (passengerRequest?.journeyStatusId === journeyStatusMap.journeyCompleted) {
    filters.isCompletionSeen = false;
  }
  const decisionsData = await getJourneyDecision4AllOrSingleUser({
    data: { filters },
  });

  for (let journeyDecision of decisionsData?.data) {
    const journeyStatusId = journeyDecision.journeyStatusId;

    // Note: isCompletionSeen filter is now handled at database level (line 280)
    // so we don't need to check it here anymore

    decisions.push(journeyDecision);

    // Journey can be created after journey is started
    let journeyData = [];
    if (journeyStatusId >= journeyStatusMap?.journeyStarted) {
      journeyData = await getData({
        tableName: "Journey",
        conditions: {
          journeyDecisionUniqueId: journeyDecision?.journeyDecisionUniqueId,
        },
      });
    }
    // get data of driver request
    const driverData = await performJoinSelect({
      baseTable: "DriverRequest",
      joins: [
        {
          table: "Users",
          on: "DriverRequest.userUniqueId = Users.userUniqueId",
        },
      ],
      conditions: {
        driverRequestId: journeyDecision?.driverRequestId,
      },
    });
    // get profile picture data of driver
    const driver = driverData[0];
    const documents = await getAttachedDocumentsByUserUniqueIdAndDocumentTypeId(
      driver?.userUniqueId,
      listOfDocumentsTypeAndId.profilePhoto,
      connection,
    );

    const data = documents?.data;
    const lastDataIndex = data?.length - 1;
    const driverProfilePhoto = data?.[lastDataIndex]?.attachedDocumentName;
    const phoneNumber = driver?.phoneNumber;

    // get vehicle data of driver
    const vdResult = await getVehicleDrivers({
      driverUserUniqueId: driver?.userUniqueId,
      assignmentStatus: "active",
      limit: 1,
      page: 1,
    });
    const vehicleOfDriver = vdResult?.data;
    // structure driver info
    const driverInfo = {
      vehicleOfDriver: vehicleOfDriver?.[0],
      driver: { ...driver, driverProfilePhoto },
    };
    driversData.push(driverInfo);

    // Use passengerRequest directly - all journey decisions are already filtered by this passengerRequestId
    const message = {
      messageTypes: messageTypes.driver_found_shipper_request,
      message: "success",
      status: driver?.journeyStatusId,
      passenger: passengerRequest,
      driver: driverInfo,
      journey: journeyData?.length > 0 ? journeyData[0] : null,
      decision: journeyDecision || null,
    };

    // Only send notification if sendNotificationsToDrivers is true and driver hasn't been notified yet
    if (
      sendNotificationsToDrivers &&
      phoneNumber &&
      !notifiedDrivers.has(phoneNumber)
    ) {
      await sendSocketIONotificationToDriver({
        message,
        phoneNumber,
      });
      notifiedDrivers.add(phoneNumber);
    }

    // Send WebSocket notification to passenger when driver accepts (status 3 - acceptedByDriver)
    // Only send if sendNotificationsToPassenger is true (e.g., when called from acceptPassengerRequest)
    // Don't send when passenger is just checking their status (API endpoint)
    if (
      journeyStatusId === journeyStatusMap.acceptedByDriver &&
      sendNotificationsToPassenger
    ) {
      const passengerUserUniqueId = passengerRequest?.userUniqueId;
      const driverUserUniqueId = driver?.userUniqueId;

      // Create unique key for passenger-driver combination to avoid duplicate notifications
      const notificationKey = `${passengerUserUniqueId}-${driverUserUniqueId}`;

      if (
        passengerUserUniqueId &&
        driverUserUniqueId &&
        !notifiedPassengersForAcceptance.has(notificationKey)
      ) {
        // Get passenger phone number
        const passengerUserData = await performJoinSelect({
          baseTable: "Users",
          joins: [],
          conditions: { userUniqueId: passengerUserUniqueId },
        });
        const passengerPhoneNumber = passengerUserData?.[0]?.phoneNumber;

        if (passengerPhoneNumber) {
          // Use the extracted notification function
          await sendPassengerNotification({
            passengerRequest,
            journeyDecision,
            driverInfo,
            journeyData: journeyData?.length > 0 ? journeyData[0] : {},
            messageType: messageTypes.driver_accepted_shipper_request,
            status: journeyStatusMap.acceptedByDriver,
            totalRecords,
            pageSize,
            page,
          });

          notifiedPassengersForAcceptance.add(notificationKey);
        }
      }
    }
  }
};

/**
 * Sends WebSocket notification to passenger for any journey status change
 * This is a generic reusable function that can be called for accept, start, complete, reject, cancel events
 * without processing all passenger requests
 * @param {Object} params - Notification parameters
 * @param {Object} params.passengerRequest - Passenger request object
 * @param {Object} params.journeyDecision - Journey decision object (optional)
 * @param {Object} params.driverInfo - Driver info with vehicle data
 * @param {Object} params.journeyData - Journey data (optional, can be empty object)
 * @param {Object} params.messageType - Message type from messageTypes (required, e.g., messageTypes.driver_accepted_shipper_request)
 * @param {number} params.status - Journey status ID (required, e.g., journeyStatusMap.acceptedByDriver)
 * @param {string} params.data - Optional message string (e.g., "Driver accepted your request")
 * @param {Object} params.totalRecords - Total records for pagination (optional)
 * @param {number} params.pageSize - Page size (optional)
 * @param {number} params.page - Page number (optional)
 * @returns {Promise<void>}
 */
const sendPassengerNotification = async ({
  passengerRequest,
  journeyDecision,
  driverInfo,
  journeyData = {},
  messageType,
  status,
  data,
  totalRecords,
  pageSize,
  page,
}) => {
  const passengerUserUniqueId = passengerRequest?.userUniqueId;
  const driverUserUniqueId = driverInfo?.driver?.userUniqueId;

  if (!passengerUserUniqueId || !driverUserUniqueId) {
    return;
  }

  if (!messageType || !status) {
    console.error(
      "@sendPassengerNotification: messageType and status are required",
    );
    return;
  }

  // Get passenger phone number
  const passengerUserData = await performJoinSelect({
    baseTable: "Users",
    joins: [],
    conditions: { userUniqueId: passengerUserUniqueId },
  });
  const passengerPhoneNumber = passengerUserData?.[0]?.phoneNumber;

  if (!passengerPhoneNumber) {
    return;
  }

  // Transform structure to match getDetailedJourneyData format
  const driverRequestWithVehicle = {
    ...driverInfo.driver,
    vehicleOfDriver: driverInfo.vehicleOfDriver,
  };

  // Build structured message for passenger notification with formattedData
  const passengerMessage = {
    messageTypes: messageType,
    message: "success",
    status: status,
    formattedData: [
      {
        passengerRequest, // Single object, not array
        driverRequests: [driverRequestWithVehicle], // Array with vehicleOfDriver
        decisions: journeyDecision ? [journeyDecision] : [],
        journey: journeyData || {}, // Object, not array
      },
    ],
  };

  // Add optional data message if provided
  if (data) {
    passengerMessage.data = data;
  }

  // Add pagination info if provided
  if (totalRecords !== undefined) {
    passengerMessage.totalRecords = totalRecords;
  }
  if (pageSize !== undefined) {
    passengerMessage.pageSize = pageSize;
  }
  if (page !== undefined) {
    passengerMessage.page = page;
  }

  await sendSocketIONotificationToPassenger({
    message: passengerMessage,
    phoneNumber: passengerPhoneNumber,
  });
};

/**
 * Verifies passenger status and finds drivers if needed
 * This is the main function that handles passenger request status verification
 * and driver matching/notifications
 * @param {Object} params - Verification parameters
 * @param {string} params.userUniqueId - Passenger's unique identifier
 * @param {Array} params.activeRequest - Pre-fetched active requests (optional)
 * @param {Object} params.totalRecords - Pre-calculated total records (optional)
 * @param {boolean} params.sendNotificationsToDrivers - Whether to send notifications to drivers
 * @param {number} params.pageSize - Page size for pagination
 * @param {number} params.page - Page number for pagination
 * @returns {Promise<Object>} Passenger status with drivers, decisions, and journey data
 */
const verifyPassengerStatus = async ({
  userUniqueId,
  activeRequest,
  totalRecords,
  pageSize,
  page,
  connection = null,
}) => {
  try {
    // 1. Check if the user has an active request (status 1, 2, 3, 4, 5, 6)
    if (!activeRequest || activeRequest?.length === 0) {
      const dataOfActiveRequest = await checkActivePassengerRequest({
        userUniqueId,
        pageSize,
        page,
        connection,
      });

      activeRequest = dataOfActiveRequest?.activeRequests;
      totalRecords = dataOfActiveRequest?.totalRecords;
    }

    // If no active request, return with totalRecords format
    if (activeRequest?.length === 0 || !activeRequest) {
      // Ensure totalRecords is available (should be set by checkActivePassengerRequest)
      const defaultTotalRecords = {
        totalCount: 0,
        waitingCount: 0,
        requestedCount: 0,
        acceptedByDriverCount: 0,
        acceptedByPassengerCount: 0,
        journeyStartedCount: 0,
        notSeenCompletedCount: 0,
        notSeenCancelledByDriverCount: 0,
      };

      return {
        message: "success",
        totalRecords: totalRecords || defaultTotalRecords,
      };
    }

    // const decisions = [],
    //   drivers = [],
    //   driversData = []; // Shared between handleWaitingRequest and handleNonWaitingRequest

    // let driverFound = false; // track if driver is found to re get active passenger request because no of waiting can be changed to requested
    // const notifiedDrivers = new Set(); // Track drivers who have already been notified to prevent duplicates
    // const notifiedPassengersForAcceptance = new Set(); // Track passenger-driver combinations for acceptance notifications

    // // Passenger may have many requests so we loop through them
    // for (const passengerRequest of activeRequest) {
    //   const journeyStatusId = passengerRequest?.journeyStatusId,
    //     passengerRequestId = passengerRequest?.passengerRequestId;

    //   // If journeyStatusId is 1 (Waiting), find nearby drivers and send to them requests
    //   if (journeyStatusId === journeyStatusMap?.waiting) {
    //     const found = await handleWaitingRequest({
    //       passengerRequest,
    //       passengerRequestId,
    //       totalRecords,
    //       pageSize,
    //       page,
    //       driversData,
    //       drivers,
    //       decisions,
    //       notifiedDrivers,
    //     });
    //     if (found) driverFound = true;
    //   }
    //   // If journeyStatusId is not 1, return current data of passenger, driver, journey, and decisions
    //   else {
    //     await handleNonWaitingRequest({
    //       passengerRequest,
    //       totalRecords,
    //       pageSize,
    //       page,
    //       driversData,
    //       decisions,
    //       notifiedDrivers,
    //       notifiedPassengersForAcceptance,
    //       sendNotificationsToDrivers,
    //       sendNotificationsToPassenger,
    //     });
    //   }
    // }

    // // If driverFound re get active passenger request because no of waiting can be changed to requested
    // if (driverFound) {
    //   const dataOfActiveRequest = await checkActivePassengerRequest({
    //     userUniqueId,
    //     pageSize,
    //     page,
    //   });
    //   activeRequest = dataOfActiveRequest?.activeRequests;
    //   totalRecords = dataOfActiveRequest?.totalRecords;
    // }

    // Final return after loop: only summary
    return {
      message: "success",
      totalRecords,
      pageSize,
      page,
    };
  } catch (error) {
    const logger = require("../../Utils/logger");
    logger.error("Unable to verify passenger status", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError(
      "Unable to verify passenger status",
      error.statusCode || 500,
    );
  }
};

module.exports = {
  verifyPassengerStatus,
  getPassengerJourneyStatus,
  seenByPassenger,
  sendPassengerNotification,
  handleWaitingRequest,
};
