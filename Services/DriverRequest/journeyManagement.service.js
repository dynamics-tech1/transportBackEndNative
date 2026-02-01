const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../Middleware/Database.config");
const { getData } = require("../../CRUD/Read/ReadData");
const { insertData } = require("../../CRUD/Create/CreateData");
// Removed unused import: sendSocketIONotificationToPassenger
const { sendFCMNotificationToUser } = require("../Firebase.service");
const { createJourneyRoutePoint } = require("../JourneyRoutePoints.service");
const {
  getJourneyDecisionByJourneyDecisionUniqueId,
} = require("../JourneyDecisions.service");
const { updateJourneyStatus } = require("../JourneyStatus.service");
const { executeInTransaction } = require("../../Utils/DatabaseTransaction");
const { journeyStatusMap, usersRoles } = require("../../Utils/ListOfSeedData");
const messageTypes = require("../../Utils/MessageTypes");
const { fetchJourneyNotificationData } = require("./helpers");
const { currentDate } = require("../../Utils/CurrentDate");
const AppError = require("../../Utils/AppError");

const startJourney = async (body) => {
  try {
    // console.log("@startJourney body =====> ", body);
    // return;
    const journeyUniqueId = uuidv4();
    const journeyDecisionUniqueId = body?.journeyDecisionUniqueId;
    const userUniqueId = body?.userUniqueId;
    const latitude = body?.latitude,
      longitude = body?.longitude;

    // Validate that the userUniqueId from token matches the driver who owns the journey decision
    if (!userUniqueId) {
      throw new AppError("User authentication required", 401);
    }
    if (!latitude || !longitude) {
      throw new AppError("Latitude and longitude are required", 400);
    }
    // Fetch journey decision with driver data to validate ownership
    // Use explicit column selection to avoid userUniqueId collision
    const validateQuery = `
      SELECT 
        JourneyDecisions.*,
        DriverRequest.driverRequestUniqueId,
        DriverRequest.userUniqueId as driverUserUniqueId,
        Users.fullName as driverFullName
      FROM JourneyDecisions
      JOIN DriverRequest ON JourneyDecisions.driverRequestId = DriverRequest.driverRequestId
      JOIN Users ON DriverRequest.userUniqueId = Users.userUniqueId
      WHERE JourneyDecisions.journeyDecisionUniqueId = ?
      LIMIT 1
    `;

    const [journeyDecisionDriverData] = await pool.query(validateQuery, [
      journeyDecisionUniqueId,
    ]);

    if (!journeyDecisionDriverData?.length) {
      throw new AppError("Journey decision not found", 404);
    }

    const combinedData = journeyDecisionDriverData[0];

    // if journey status id is not equal to journeyStatusMap.acceptedByPassenger, return error
    if (combinedData.journeyStatusId !== journeyStatusMap.acceptedByPassenger) {
      throw new AppError("This journey is not accepted by passenger", 400);
    }
    // Validate userUniqueId matches the driver who owns this journey decision
    if (combinedData.driverUserUniqueId !== userUniqueId) {
      throw new AppError("Driver user does not match journey decision", 403);
    }

    // Wrap Journey creation/route point and status updates in a single transaction
    // This ensures atomicity - either all operations succeed or all fail
    await executeInTransaction(
      async (connection) => {
        // Check if Journey exists within transaction using connection for consistency
        const checkJourneySql = `SELECT * FROM Journey WHERE journeyDecisionUniqueId = ? LIMIT 1`;
        const [existingJourneyCheck] = await connection.query(checkJourneySql, [
          journeyDecisionUniqueId,
        ]);

        let finalJourneyUniqueId = journeyUniqueId;

        // Create Journey if it doesn't exist (within transaction)
        if (
          !existingJourneyCheck?.length ||
          existingJourneyCheck.length === 0
        ) {
          await insertData({
            tableName: "Journey",
            colAndVal: {
              journeyUniqueId,
              journeyDecisionUniqueId: body.journeyDecisionUniqueId,
              journeyStatusId: body.journeyStatusId,
              startTime: currentDate(),
              journeyCreatedBy: userUniqueId,
              journeyCreatedAt: currentDate(),
            },
            connection, // Pass connection for transaction support
          });

          // Create initial JourneyRoutePoint with correct parameter (within transaction)
          // Fixed: Use journeyDecisionUniqueId instead of journeyUniqueId
          await createJourneyRoutePoint(
            {
              journeyDecisionUniqueId: body.journeyDecisionUniqueId,
              latitude,
              longitude,
              userUniqueId,
            },
            connection, // Pass connection for transaction support
          );
        } else {
          // Journey already exists, use its journeyUniqueId for status update
          finalJourneyUniqueId = existingJourneyCheck[0].journeyUniqueId;
        }

        // Update journey status to journeyStarted (within transaction)
        // Include journeyUniqueId so updateJourneyStatus can update Journey table too
        await updateJourneyStatus({
          ...body,
          journeyUniqueId: finalJourneyUniqueId, // Add journeyUniqueId to update Journey table
          connection, // Pass connection for transaction support
        });
      },
      {
        timeout: 15000, // 15 second timeout for journey start operations
        logging: true,
      },
    );

    // Import here to avoid circular dependency
    const {
      sendPassengerNotification,
    } = require("../PassengerRequest/statusVerification.service");

    // Fetch all journey notification data using helper function
    // Pass journeyDecisionDriverData[0] (combinedData) as driverRequest to avoid re-fetching
    // The join query already includes DriverRequest + Users + JourneyDecisions data
    // Extract journey decision data from join result for optimization
    // IMPORTANT: Use updated journeyStatusId (journeyStarted) instead of old status from combinedData
    const journeyDecisionFromJoin = {
      journeyDecisionUniqueId: combinedData.journeyDecisionUniqueId,
      passengerRequestId: combinedData.passengerRequestId,
      driverRequestId: combinedData.driverRequestId,
      journeyStatusId: journeyStatusMap.journeyStarted, // Use updated status, not combinedData.journeyStatusId
      decisionTime: combinedData.decisionTime,
      decisionBy: combinedData.decisionBy,
      shippingCostByDriver: combinedData.shippingCostByDriver,
      shippingDateByDriver: combinedData.shippingDateByDriver,
      deliveryDateByDriver: combinedData.deliveryDateByDriver,
    };
    const {
      passengerRequest,
      journeyDecision: journeyDecisionData,
      driverInfo,
      journeyData,
    } = await fetchJourneyNotificationData(
      journeyDecisionUniqueId,
      [combinedData], // Pass already-fetched driver request data from join query (includes Users join)
      null, // No vehicle data available
      [journeyDecisionFromJoin], // Pass journey decision data extracted from join query (array format)
    );

    // Send notification directly if data is available
    if (passengerRequest && journeyDecisionData && driverInfo) {
      await sendPassengerNotification({
        passengerRequest,
        journeyDecision: journeyDecisionData,
        driverInfo,
        journeyData,
        messageType: messageTypes.driver_started_journey,
        status: journeyStatusMap.journeyStarted,
      });
    }

    // Send FCM notification to passenger if driver has an active journey request
    if (passengerRequest?.userUniqueId) {
      sendFCMNotificationToUser({
        userUniqueId: passengerRequest.userUniqueId,
        roleId: 1,
        notification: {
          title: messageTypes.driver_started_journey.message,
          body: messageTypes.driver_started_journey.details,
        },
      });
    }

    // Build response structure matching verifyDriverStatus/handleExistingJourney format
    // Use data we already have instead of calling verifyDriverStatus
    const uniqueIds = {
      driverRequestUniqueId: driverInfo?.driver?.driverRequestUniqueId,
      passengerRequestUniqueId: passengerRequest?.passengerRequestUniqueId,
      journeyDecisionUniqueId: journeyDecisionData?.journeyDecisionUniqueId,
      journeyUniqueId: journeyData?.journeyUniqueId || journeyUniqueId,
    };

    const response = {
      message: "success",
      status: journeyStatusMap.journeyStarted,
      uniqueIds,
      driver: {
        driver: driverInfo?.driver || null,
        vehicle: driverInfo?.vehicleOfDriver || null,
      },
      passenger: passengerRequest || null,
      journey: journeyData || null,
      decision: journeyDecisionData || null,
    };

    return response;
  } catch (error) {
    console.error("Error starting journey:", {
      error: error.message,
    });
    throw new AppError(
      error.message || "Unable to start journey",
      error.statusCode || 500,
    );
  }
};
const completeJourney = async (body) => {
  try {
    const {
      journeyDecisionUniqueId,
      userUniqueId,
      passengerRequestUniqueId,
      journeyUniqueId,
      driverRequestUniqueId,
    } = body;

    // 1. Validate all UUIDs in one optimized query
    // Use explicit column selection to avoid userUniqueId collision between DriverRequest and PassengerRequest
    const validateQuery = `
      SELECT 
        JourneyDecisions.*,
        DriverRequest.driverRequestUniqueId,
        DriverRequest.userUniqueId as driverUserUniqueId,
        PassengerRequest.passengerRequestUniqueId,
        PassengerRequest.userUniqueId as passengerUserUniqueId,
        Journey.journeyUniqueId,
        Journey.startTime,
        Journey.endTime,
        Users.fullName as driverFullName,
        Users.phoneNumber as driverPhoneNumber
      FROM JourneyDecisions
      JOIN DriverRequest ON JourneyDecisions.driverRequestId = DriverRequest.driverRequestId
      JOIN PassengerRequest ON JourneyDecisions.passengerRequestId = PassengerRequest.passengerRequestId
      JOIN Journey ON Journey.journeyDecisionUniqueId = JourneyDecisions.journeyDecisionUniqueId
      JOIN Users ON DriverRequest.userUniqueId = Users.userUniqueId
      WHERE JourneyDecisions.journeyDecisionUniqueId = ?
        AND PassengerRequest.passengerRequestUniqueId = ?
        AND DriverRequest.driverRequestUniqueId = ?
        AND Journey.journeyUniqueId = ?
      LIMIT 1
    `;

    const [journeyDecisionDriverData] = await pool.query(validateQuery, [
      journeyDecisionUniqueId,
      passengerRequestUniqueId,
      driverRequestUniqueId,
      journeyUniqueId,
    ]);

    // If no data returned, one or more UUIDs don't match or don't exist
    if (!journeyDecisionDriverData?.length) {
      throw new AppError(
        "Journey data not found or UUIDs mismatch. Please verify journeyDecisionUniqueId, passengerRequestUniqueId, driverRequestUniqueId, and journeyUniqueId are correct.",
        404,
      );
    }

    const combinedData = journeyDecisionDriverData[0];

    // Validate driver identity (userUniqueId from token must match driver in database)
    // Skip validation if user is admin or super admin (they can complete journeys on behalf of drivers)
    const isAdmin =
      body.roleId === usersRoles.adminRoleId ||
      body.roleId === usersRoles.supperAdminRoleId;
    if (!isAdmin && combinedData.driverUserUniqueId !== userUniqueId) {
      throw new AppError("Driver user does not match journey decision", 403);
    }

    // 2. Wrap journey status update in transaction to ensure atomicity
    // updateJourneyStatus will update multiple tables: Journey, PassengerRequest, JourneyDecisions, DriverRequest
    // All updates must succeed or all must fail to maintain data consistency
    await executeInTransaction(
      async (connection) => {
        // Update journey status with connection for transaction support
        // Pass all required IDs to ensure all related tables are updated atomically
        await updateJourneyStatus({
          ...body,
          connection, // Pass connection for transaction support
        });

        // Record completion location in JourneyRoutePoints
        await createJourneyRoutePoint(
          {
            journeyDecisionUniqueId: body.journeyDecisionUniqueId,
            latitude: body.latitude,
            longitude: body.longitude,
            userUniqueId,
          },
          connection, // Pass connection for transaction support
        );
      },
      {
        timeout: 20000, // 20 second timeout for journey completion operations
        logging: true, // Log transaction operations
      },
    );

    // After successful transaction commit, handle notifications
    // Import here to avoid circular dependency
    const {
      sendPassengerNotification,
    } = require("../PassengerRequest/statusVerification.service");

    // Fetch all journey notification data using helper function (after successful transaction)
    // Pass combinedData as driverRequest and extract journey decision data to avoid re-fetching
    // The join query already includes JourneyDecisions + DriverRequest + Users data
    const journeyDecisionFromJoin = {
      journeyDecisionUniqueId: combinedData.journeyDecisionUniqueId,
      passengerRequestId: combinedData.passengerRequestId,
      driverRequestId: combinedData.driverRequestId,
      journeyStatusId: combinedData.journeyStatusId,
      decisionTime: combinedData.decisionTime,
      decisionBy: combinedData.decisionBy,
      shippingCostByDriver: combinedData.shippingCostByDriver,
      shippingDateByDriver: combinedData.shippingDateByDriver,
      deliveryDateByDriver: combinedData.deliveryDateByDriver,
    };
    const notificationDataResult = await fetchJourneyNotificationData(
      journeyDecisionUniqueId,
      [combinedData], // Pass already-fetched driver request data from join query (includes Users join)
      null, // No vehicle data available
      [journeyDecisionFromJoin], // Pass journey decision data extracted from join query (array format)
    );
    const {
      passengerRequest,
      journeyDecision: journeyDecisionData,
      driverInfo,
      journeyData,
    } = notificationDataResult;

    // Send notifications only after successful transaction commit
    // This ensures notifications are only sent if all database updates succeeded
    if (passengerRequest && journeyDecisionData && driverInfo) {
      await sendPassengerNotification({
        passengerRequest,
        journeyDecision: journeyDecisionData,
        driverInfo,
        journeyData,
        messageType: messageTypes.driver_completed_journey,
        status: journeyStatusMap.journeyCompleted,
        data: "Journey completed successfully",
      });

      // Send FCM notification (after successful transaction commit)
      if (passengerRequest?.userUniqueId) {
        sendFCMNotificationToUser({
          userUniqueId: passengerRequest.userUniqueId,
          roleId: 1,
          notification: {
            title: messageTypes.driver_completed_journey.message,
            body: messageTypes.driver_completed_journey.details,
          },
        });
      }
    }

    // Build response structure matching verifyDriverStatus/handleExistingJourney format
    // Use data we already have instead of calling verifyDriverStatus
    const uniqueIds = {
      driverRequestUniqueId: driverInfo?.driver?.driverRequestUniqueId,
      passengerRequestUniqueId: passengerRequest?.passengerRequestUniqueId,
      journeyDecisionUniqueId: journeyDecisionData?.journeyDecisionUniqueId,
      journeyUniqueId: journeyData?.journeyUniqueId || journeyUniqueId,
    };

    const response = {
      message: "success",
      status: journeyStatusMap.journeyCompleted,
      uniqueIds,
      driver: {
        driver: driverInfo?.driver || null,
        vehicle: driverInfo?.vehicleOfDriver || null,
      },
      passenger: passengerRequest || null,
      journey: journeyData || null,
      decision: journeyDecisionData || null,
    };

    return response;
  } catch (error) {
    const logger = require("../../Utils/logger");
    logger.error("Unable to complete journey", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError(
      error.message || "Unable to complete journey",
      error.statusCode || 500,
    );
  }
};
const sendUpdatedLocation = async (body) => {
  try {
    const { journeyDecisionUniqueId, latitude, longitude, userUniqueId } = body;

    // Validate required fields
    if (!journeyDecisionUniqueId) {
      throw new AppError("journeyDecisionUniqueId is required", 400);
    }

    if (latitude === undefined || latitude === null) {
      throw new AppError("latitude is required", 400);
    }

    if (longitude === undefined || longitude === null) {
      throw new AppError("longitude is required", 400);
    }

    if (userUniqueId === undefined || userUniqueId === null) {
      throw new AppError("userUniqueId is required", 400);
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      throw new AppError("Invalid latitude. Must be between -90 and 90", 400);
    }

    if (longitude < -180 || longitude > 180) {
      throw new AppError(
        "Invalid longitude. Must be between -180 and 180",
        400,
      );
    }

    // Fetch journey decision to validate driver owns this journey
    const journeyDecision = await getJourneyDecisionByJourneyDecisionUniqueId(
      journeyDecisionUniqueId,
    );

    if (!journeyDecision?.data || journeyDecision.data.length === 0) {
      throw new AppError("Journey decision not found", 404);
    }

    const journeyDecisionData = journeyDecision.data[0];
    const driverRequestId = journeyDecisionData.driverRequestId;

    // Validate driver owns this journey request
    const driverRequest = await getData({
      tableName: "DriverRequest",
      conditions: {
        driverRequestId,
        userUniqueId, // Ensure driver owns this request
      },
      limit: 1,
    });

    if (!driverRequest || driverRequest.length === 0) {
      throw new AppError(
        "Driver request not found or you don't have permission to update location for this journey",
        403,
      );
    }

    // Validate journey status - location updates should only be sent for active journeys
    const journeyStatusId = driverRequest[0].journeyStatusId;
    const activeStatuses = [
      journeyStatusMap.acceptedByDriver,
      journeyStatusMap.acceptedByPassenger,
      journeyStatusMap.journeyStarted,
    ];

    if (!activeStatuses.includes(journeyStatusId)) {
      throw new AppError(
        "Location updates can only be sent for active journeys (accepted or started)",
        400,
      );
    }

    // Fetch passenger phone number from journey data if not provided
    let passengerPhoneNumber = body.passengerPhone;
    if (!passengerPhoneNumber) {
      // Pass already-fetched journeyDecision and driverRequest to avoid re-fetching
      const notificationData = await fetchJourneyNotificationData(
        journeyDecisionUniqueId,
        driverRequest, // Already fetched above
        null, // No vehicle data available
        journeyDecision, // Already fetched above - pass to avoid re-fetching
      );

      if (
        notificationData.message === "error" ||
        !notificationData.passengerRequest
      ) {
        throw new AppError(
          "Unable to fetch passenger information for location update",
          404,
        );
      }

      passengerPhoneNumber =
        notificationData.passengerRequest?.phoneNumber || null;

      if (!passengerPhoneNumber) {
        throw new AppError("Passenger phone number not found", 404);
      }
    }

    // Store location in JourneyRoutePoints table for historical tracking and real-time notification
    // Single table insert - no transaction needed (atomic operation)
    // createJourneyRoutePoint handles storing location and sending notification to passenger
    // Note: createJourneyRoutePoint is already imported at the top of the file
    const routePointResult = await createJourneyRoutePoint({
      journeyDecisionUniqueId,
      latitude,
      longitude,
      userUniqueId,
      passengerPhoneNumber, // Pass for notification (createJourneyRoutePoint sends notification)
      ...(body.additionalData || {}), // Include any additional data for notification
    });

    // If route point creation failed, return error
    if (!routePointResult.success) {
      throw new AppError(
        routePointResult.message || "Failed to store location",
        400,
      );
    }

    // Note: createJourneyRoutePoint already sends WebSocket notification to passenger
    // with messageType: update_drivers_location_to_shipper
    // No need to send duplicate notification here

    return {
      message: "success",
      data: "Location updated and sent to passenger successfully",
      journeyRoutePointsUniqueId:
        routePointResult.data?.journeyRoutePointsUniqueId,
      latitude,
      longitude,
      timestamp: currentDate(),
      journeyDecisionUniqueId,
    };
  } catch (error) {
    console.error("@sendUpdatedLocation error:", error);
    throw new AppError(
      error.message || "Unable to send updated location",
      error.statusCode || 500,
    );
  }
};

module.exports = {
  startJourney,
  completeJourney,
  sendUpdatedLocation,
};
