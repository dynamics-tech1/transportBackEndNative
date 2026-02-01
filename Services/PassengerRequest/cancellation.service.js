const { getData, performJoinSelect } = require("../../CRUD/Read/ReadData");
const { updateData } = require("../../CRUD/Update/Data.update");
const { pool } = require("../../Middleware/Database.config");
const { journeyStatusMap } = require("../../Utils/ListOfSeedData");
const AppError = require("../../Utils/AppError");

/**
 * Gets cancellation notifications for a passenger
 * @param {Object} params - Query parameters
 * @param {string} params.userUniqueId - Passenger's unique identifier
 * @param {string} params.seenStatus - Filter by seen status (optional)
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @returns {Promise<Object>} Cancellation notifications with pagination
 */
const getCancellationNotifications = async ({
  userUniqueId,
  seenStatus,
  page = 1,
  limit = 10,
}) => {
  try {
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    let whereConditions = [
      "PassengerRequest.userUniqueId = ?",
      "JourneyDecisions.journeyStatusId IN (?, ?)",
    ];
    let queryParams = [
      userUniqueId,
      journeyStatusMap.cancelledByDriver,
      journeyStatusMap.cancelledByAdmin,
    ];

    // Add seen status filter if provided
    if (seenStatus) {
      whereConditions.push(
        "JourneyDecisions.isCancellationByDriverSeenByPassenger = ?",
      );
      queryParams.push(seenStatus);
    }

    // Use raw SQL query for better control with aliases
    const sql = `
      SELECT 
        -- PassengerRequest data
        PassengerRequest.passengerRequestId,
        PassengerRequest.passengerRequestUniqueId,
        PassengerRequest.userUniqueId as passengerUserUniqueId,
        PassengerRequest.vehicleTypeUniqueId,
        PassengerRequest.originLatitude as passengerOriginLatitude,
        PassengerRequest.originLongitude as passengerOriginLongitude,
        PassengerRequest.originPlace as passengerOriginPlace,
        PassengerRequest.destinationLatitude,
        PassengerRequest.destinationLongitude,
        PassengerRequest.destinationPlace,
        PassengerRequest.shipperRequestCreatedAt as shipperRequestCreatedAt,
        PassengerRequest.shippableItemName,
        PassengerRequest.shippableItemQtyInQuintal,
        PassengerRequest.shippingDate,
        PassengerRequest.deliveryDate,
        PassengerRequest.shippingCost,
        
        -- Passenger User data
        PassengerUser.fullName as passengerFullName,
        PassengerUser.phoneNumber as passengerPhoneNumber,
        PassengerUser.email as passengerEmail,
        
        -- JourneyDecisions data
        JourneyDecisions.journeyDecisionId,
        JourneyDecisions.journeyDecisionUniqueId,
        JourneyDecisions.decisionTime,
        JourneyDecisions.decisionBy,
        JourneyDecisions.journeyStatusId,
        JourneyDecisions.isCancellationByDriverSeenByPassenger,
        
        -- DriverRequest data
        DriverRequest.driverRequestId,
        DriverRequest.driverRequestUniqueId,
        DriverRequest.userUniqueId as driverUserUniqueId,
        DriverRequest.originLatitude,
        DriverRequest.originLongitude,
        DriverRequest.originPlace,
        DriverRequest.driverRequestCreatedAt,
        
        -- Driver User data
        DriverUser.fullName as driverFullName,
        DriverUser.phoneNumber as driverPhoneNumber,
        DriverUser.email as driverEmail
        
      FROM JourneyDecisions
      INNER JOIN PassengerRequest ON JourneyDecisions.passengerRequestId = PassengerRequest.passengerRequestId
      INNER JOIN Users as PassengerUser ON PassengerRequest.userUniqueId = PassengerUser.userUniqueId
      INNER JOIN DriverRequest ON JourneyDecisions.driverRequestId = DriverRequest.driverRequestId
      INNER JOIN Users as DriverUser ON DriverRequest.userUniqueId = DriverUser.userUniqueId
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY JourneyDecisions.decisionTime DESC
      LIMIT ? OFFSET ?
    `;

    // Get total count query (before adding pagination params)
    const countSql = `
      SELECT COUNT(*) as total
      FROM JourneyDecisions
      INNER JOIN PassengerRequest ON JourneyDecisions.passengerRequestId = PassengerRequest.passengerRequestId
      WHERE ${whereConditions.join(" AND ")}
    `;

    // Execute count query first (before adding pagination params)
    const [countResults] = await pool.query(countSql, queryParams);
    const total = countResults[0]?.total || 0;

    // Add pagination params to query params for main query
    const paginatedQueryParams = [
      ...queryParams,
      parseInt(limit),
      parseInt(offset),
    ];

    const [results] = await pool.query(sql, paginatedQueryParams);

    if (results.length === 0) {
      return {
        message: "success",
        data: [],
        count: 0,
      };
    }

    // Get journey data for each request
    const enrichedData = await Promise.all(
      results.map(async (request) => {
        try {
          // Get journey data if exists
          let journey = null;
          if (request.journeyDecisionUniqueId) {
            const journeyData = await performJoinSelect({
              baseTable: "Journey",
              joins: [
                {
                  table: "JourneyDecisions",
                  on: "Journey.journeyDecisionUniqueId = JourneyDecisions.journeyDecisionUniqueId",
                },
              ],
              conditions: {
                "Journey.journeyDecisionUniqueId":
                  request.journeyDecisionUniqueId,
              },
            });
            journey = journeyData?.[0] || null;
          }

          // Structure the response
          return {
            passenger: {
              passengerRequestId: request.passengerRequestId,
              passengerRequestUniqueId: request.passengerRequestUniqueId,
              passengerUserUniqueId: request.passengerUserUniqueId,
              vehicleTypeUniqueId: request.vehicleTypeUniqueId,
              originLatitude: request.passengerOriginLatitude,
              originLongitude: request.passengerOriginLongitude,
              originPlace: request.passengerOriginPlace,
              destinationLatitude: request.destinationLatitude,
              destinationLongitude: request.destinationLongitude,
              destinationPlace: request.destinationPlace,
              shipperRequestCreatedAt: request.shipperRequestCreatedAt,
              shippableItemName: request.shippableItemName,
              shippableItemQtyInQuintal: request.shippableItemQtyInQuintal,
              shippingDate: request.shippingDate,
              deliveryDate: request.deliveryDate,
              shippingCost: request.shippingCost,
              fullName: request.passengerFullName,
              phoneNumber: request.passengerPhoneNumber,
              email: request.passengerEmail,
            },
            driver: {
              userId: request.driverUserUniqueId,
              userUniqueId: request.driverUserUniqueId,
              fullName: request.driverFullName,
              phoneNumber: request.driverPhoneNumber,
              email: request.driverEmail,
            },
            journeyDecision: {
              journeyDecisionId: request.journeyDecisionId,
              journeyDecisionUniqueId: request.journeyDecisionUniqueId,
              decisionTime: request.decisionTime,
              decisionBy: request.decisionBy,
              journeyStatusId: request.journeyStatusId,
              isCancellationByDriverSeenByPassenger:
                request.isCancellationByDriverSeenByPassenger,
            },
            journey: journey,
          };
        } catch (error) {
          const logger = require("../../Utils/logger");
          logger.error("Error enriching cancellation data", {
            error: error.message,
            stack: error.stack,
          });
          // Return basic structure if enrichment fails
          return {
            passenger: null,
            driver: null,
            journeyDecision: {
              journeyDecisionUniqueId: request.journeyDecisionUniqueId,
              journeyStatusId: request.journeyStatusId,
            },
            journey: null,
          };
        }
      }),
    );

    return {
      message: "success",
      data: enrichedData,
      count: total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  } catch (error) {
    const logger = require("../../Utils/logger");
    logger.error("Error getting canceled journeys", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError(
      error.message || "Unable to get cancellation notifications",
      error.statusCode || 500,
    );
  }
};

/**
 * Marks a cancellation notification as seen by passenger
 * @param {Object} body - Mark as seen data
 * @param {string} body.userUniqueId - Passenger's unique identifier
 * @param {string} body.journeyDecisionUniqueId - Journey decision unique ID
 * @returns {Promise<Object>} Success or error response
 */
const markCancellationAsSeen = async ({
  userUniqueId,
  journeyDecisionUniqueId,
}) => {
  try {
    if (!userUniqueId || !journeyDecisionUniqueId) {
      throw new AppError(
        "userUniqueId and journeyDecisionUniqueId are required",
        400,
      );
    }

    // Get the journey decision to verify it belongs to this passenger
    const journeyDecision = await getData({
      tableName: "JourneyDecisions",
      conditions: { journeyDecisionUniqueId },
    });

    if (!journeyDecision || journeyDecision.length === 0) {
      throw new AppError("Journey decision not found", 404);
    }

    const passengerRequestId = journeyDecision[0].passengerRequestId;

    // Verify the passenger request belongs to this user
    const passengerRequest = await getData({
      tableName: "PassengerRequest",
      conditions: {
        passengerRequestId,
        userUniqueId,
      },
    });

    if (!passengerRequest || passengerRequest.length === 0) {
      throw new AppError(
        "Unauthorized: This cancellation does not belong to you",
        403,
      );
    }

    // Update the seen status
    const result = await updateData({
      tableName: "JourneyDecisions",
      conditions: { journeyDecisionUniqueId },
      updateValues: {
        isCancellationByDriverSeenByPassenger: "seen by passenger",
      },
    });

    if (result.affectedRows === 0) {
      throw new AppError("Unable to update cancellation status", 400);
    }

    return {
      message: "success",
      data: "Cancellation notification marked as seen",
    };
  } catch (error) {
    throw new AppError(
      error.message || "Unable to mark cancellation as seen",
      error.statusCode || 500,
    );
  }
};

module.exports = {
  getCancellationNotifications,
  markCancellationAsSeen,
};
