const { getData, performJoinSelect } = require("../../CRUD/Read/ReadData");
const { updateData } = require("../../CRUD/Update/Data.update");
const { deleteData } = require("../../CRUD/Delete/DeleteData");
const { createNewPassengerRequest } = require("../../CRUD/Create/CreateData");
const { pool } = require("../../Middleware/Database.config");
const {
  journeyStatusMap,
  usersRoles,
  listOfDocumentsTypeAndId,
} = require("../../Utils/ListOfSeedData");
const logger = require("../../Utils/logger");
const AppError = require("../../Utils/AppError");
// verifyPassengerStatus removed - only available via API endpoint to reduce heavy operations
const {
  handleWaitingRequest,
  verifyPassengerStatus,
} = require("./statusVerification.service");

/**
 * Creates a new passenger request
 *
 * This function consolidates three creation scenarios:
 * 1. **Passenger self-creates**: Sets audit fields from token, journeyStatusId = waiting
 * 2. **Admin creates for shipper**: Creates user first, sets audit fields from admin token, journeyStatusId = waiting
 * 3. **Driver takes from street**: Creates user first, sets audit fields from driver info, journeyStatusId = journeyStarted
 *
 * Note: Admin and driver user creation is handled by the caller before calling this function.
 * The caller must pass userUniqueId in the body (for passenger) or create user first (for admin/driver).
 *
 * Audit Trail:
 * - shipperRequestCreatedBy: userUniqueId of who created the request (passenger/admin/driver)
 * - shipperRequestCreatedByRoleId: roleId of who created the request (1=passenger, 2=driver, 3=admin)
 * These fields are extracted from body and stored in database to track request origin.
 *
 * Return Behavior:
 * - If shipperRequestCreatedByRoleId ===driverRoleId (2): Returns array of created requests directly
 *   (Driver scenario - no need for status counts, request is used immediately)
 * - Otherwise (passenger/admin): Returns verifyPassengerStatus result with status counts
 *   (Passenger/Admin scenario - frontend needs status counts for notifications)
 *
 * @param {Object} body - Request body data
 *   - userUniqueId: Required - Passenger's userUniqueId (set by caller)
 *   - shipperRequestCreatedBy: Required - userUniqueId of who created this request (audit trail)
 *   - shipperRequestCreatedByRoleId: Required - roleId of who created this request (1=passenger, 2=driver, 3=admin)
 *   - passengerRequestBatchId: Required - Batch ID for grouping related requests
 *   - numberOfVehicles: Optional - Number of   Vehicle needed (default: 1)
 *   - vehicle, destination, originLocation, shippingDate, deliveryDate, shippingCost, etc.
 * @param {number} journeyStatusId - Initial journey status ID
 *   - waiting (1): For passenger/admin scenarios (driver hasn't picked up yet)
 *   - journeyStarted (5): For driver "take from street" scenario (goods already picked up)
 * @param {Object} connection - Optional database connection for transaction support
 *   - If provided, all database operations use this connection (for atomicity)
 *   - If null, uses connection pool (default behavior)
 * @returns {Promise<Object|Array>}
 *   - If driver scenario: Returns array of created request objects directly
 *   - If passenger/admin scenario: Returns verifyPassengerStatus result with status counts
 *   - On error: Returns { message: "error", error: "error message" }
 */
const createPassengerRequest = async (
  body,
  journeyStatusId,
  connection = null,
) => {
  try {
    const { shipperRequestCreatedByRoleId } = body;

    // Admin user creation is handled in controller before calling this function
    // userUniqueId must be set by the caller (controller handles admin case)
    const userUniqueId = body?.userUniqueId;
    if (!userUniqueId) {
      throw new AppError("userUniqueId is required", 400);
    }

    const numberOfVehicles = body?.numberOfVehicles || 1;
    // First check if the user has an active request based on passengerRequestBatchId
    const passengerRequestBatchId = body?.passengerRequestBatchId;
    if (!passengerRequestBatchId) {
      throw new AppError("Batch uniqueId Can't be null", 400);
    }

    // Use connection for batch check if provided (for transaction support)
    // Otherwise use regular getData which uses pool
    let dataByBatchId;
    if (connection) {
      // Use raw query with connection for transaction support
      const batchCheckSql = `SELECT * FROM PassengerRequest WHERE passengerRequestBatchId = ? AND userUniqueId = ?`;
      const [batchCheckResult] = await connection.query(batchCheckSql, [
        passengerRequestBatchId,
        userUniqueId,
      ]);
      dataByBatchId = batchCheckResult;
    } else {
      dataByBatchId = await getData({
        tableName: "PassengerRequest",
        conditions: { passengerRequestBatchId, userUniqueId },
      });
    }

    if (dataByBatchId?.length >= numberOfVehicles) {
      // User has already created all required requests for this batch
      throw new AppError(
        `All required requests have already been created for this batch.`,
        400,
      );
    }

    const newRequests = [];
    const noOfRecords = numberOfVehicles - dataByBatchId?.length;

    // Step 1: Create all requests in parallel for better performance
    // Parallel execution is safe because:
    // - Each request generates a unique UUID (passengerRequestUniqueId) - no conflicts
    // - Database auto-increment IDs (passengerRequestId) - order doesn't matter
    // - No dependencies between requests - each is independent
    // - Batch limit check happens before creation, so we create exactly noOfRecords
    if (noOfRecords > 0) {
      // Create array of promises for parallel execution
      const promises = Array(noOfRecords)
        .fill()
        .map(() =>
          createNewPassengerRequest(
            body,
            userUniqueId,
            journeyStatusId,
            connection,
          ),
        );

      // Wait for all requests to be created in parallel
      const results = await Promise.all(promises);

      // Extract created requests from results
      results.forEach((result) => {
        if (result?.data?.[0]) {
          newRequests.push(result.data[0]);
        }
      });
    }

    // Step 2: Process driver finding in parallel for all waiting requests
    // Parallel execution is safe because:
    // - Each request operates on different passengerRequestId (no conflicts)
    // - Database operations (insert/update) are independent per passenger request
    // - Local arrays prevent race conditions on shared data structures
    // Note: Minor race condition on notifiedDrivers Set (check-then-add) may cause
    // duplicate notifications to the same driver, but this is acceptable and non-critical
    const waitingRequests = newRequests.filter(
      (req) => req?.journeyStatusId === journeyStatusMap.waiting,
    );

    if (waitingRequests.length > 0) {
      // Shared Set for notification deduplication across parallel requests
      // Note: There's a small window where duplicate notifications could occur if
      // the same driver is found by multiple requests simultaneously, but this is rare
      // and non-critical (driver just gets notified twice, which is acceptable)
      const notifiedDrivers = new Set();

      // Process all waiting requests in parallel for better performance
      await Promise.all(
        waitingRequests.map(async (createdRequest) => {
          // Local arrays per request to avoid race conditions on shared arrays
          const localDriversData = [];
          const localDrivers = [];
          const localDecisions = [];

          await handleWaitingRequest({
            passengerRequest: createdRequest,
            passengerRequestId: createdRequest.passengerRequestId,
            totalRecords: null, // Not needed for create flow
            pageSize: null,
            page: null,
            driversData: localDriversData,
            drivers: localDrivers,
            decisions: localDecisions,
            notifiedDrivers, // Shared Set for deduplication (minor race condition acceptable)
            userUniqueId, // Pass userUniqueId for audit columns
            connection, // Pass connection for transaction consistency
          });
        }),
      );
    }

    if (shipperRequestCreatedByRoleId === usersRoles.driverRoleId) {
      return newRequests;
    }
    return await verifyPassengerStatus({
      userUniqueId,
      connection,
    });
  } catch (error) {
    logger.error("Error in createPassengerRequest service", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      userUniqueId: body?.userUniqueId,
      shipperRequestCreatedByRoleId: body?.shipperRequestCreatedByRoleId,
      passengerRequestBatchId: body?.passengerRequestBatchId,
      vehicleTypeUniqueId: body?.vehicle?.vehicleTypeUniqueId,
    });
    throw new AppError(
      error.message || "Unable to create request",
      error.statusCode || 500,
    );
  }
};

/**
 * Gets a passenger request by passenger request ID
 * @param {number} passengerRequestId - Passenger request ID
 * @returns {Promise<Object>} Success or error response with request data
 */
const getPassengerRequestByPassengerRequestId = async (passengerRequestId) => {
  try {
    const result = await performJoinSelect({
      baseTable: "PassengerRequest",
      joins: [
        {
          table: "Users",
          on: "PassengerRequest.userUniqueId = Users.userUniqueId",
        },
      ],
      conditions: { passengerRequestId },
    });
    return { message: "success", data: result[0] };
  } catch (error) {
    const logger = require("../../Utils/logger");
    logger.error("Unable to get passenger request data", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError("unable to get data", 500);
  }
};

/**
 * Gets a passenger request by passenger request unique ID
 * @param {string} passengerRequestUniqueId - Passenger request unique ID
 * @returns {Promise<Object>} Success or error response with request data
 */
// DEPRECATED: Use getPassengerRequest4allOrSingleUser with filters.passengerRequestUniqueId instead
// const getPassengerRequestByPassengerRequestUniqueId = async (
//   passengerRequestUniqueId
// ) => {
//   try {
//     const result = await performJoinSelect({
//       baseTable: "PassengerRequest",
//       joins: [
//         {
//           table: "Users",
//           on: "PassengerRequest.userUniqueId = Users.userUniqueId",
//         },
//       ],
//       conditions: {
//         passengerRequestUniqueId,
//       },
//     });

//     if (!result?.length) {
//       return { message: "error", error: "Request not found" };
//     }

//     return { message: "success", data: result[0] };
//   } catch (error) {
//     return { message: "error", error: "Unable to retrieve request" };
//   }
// };

/**
 * Gets passenger requests with filtering and pagination
 * @param {Object} params - Query parameters
 * @param {Object} params.data - Filter and pagination data
 * @returns {Promise<Object>} Passenger requests with pagination
 */
const getPassengerRequest4allOrSingleUser = async ({ data }) => {
  try {
    const { userUniqueId, target, page = 1, limit = 10, filters = {} } = data;
    const offset = (page - 1) * limit;

    let whereClause = "";
    let queryParams = [];
    let countParams = [];

    if (filters?.search) {
      // Find by phone or email or full name or shippableItemName or origin/destination places
      whereClause += whereClause ? " AND " : " WHERE ";
      whereClause += ` (
    Users.phoneNumber LIKE ? OR 
    Users.email LIKE ? OR 
    Users.fullName LIKE ? OR
    PassengerRequest.shippableItemName LIKE ? OR
    PassengerRequest.originPlace LIKE ? OR
    PassengerRequest.destinationPlace LIKE ?
  )`;

      const searchPattern = `%${filters.search}%`;
      // Add the same pattern for all 6 conditions
      queryParams?.push(
        searchPattern, // phoneNumber
        searchPattern, // email
        searchPattern, // fullName
        searchPattern, // shippableItemName
        searchPattern, // originPlace
        searchPattern, // destinationPlace
      );
      countParams?.push(
        searchPattern, // phoneNumber
        searchPattern, // email
        searchPattern, // fullName
        searchPattern, // shippableItemName
        searchPattern, // originPlace
        searchPattern, // destinationPlace
      );
    }

    // Build WHERE clause based on target and filters
    if (target !== "all" && userUniqueId) {
      whereClause = " WHERE PassengerRequest.userUniqueId = ?";
      queryParams = [userUniqueId];
      countParams = [userUniqueId];
    }

    // Add additional filters if provided
    if (filters?.vehicleTypeUniqueId) {
      whereClause += whereClause ? " AND " : " WHERE ";
      whereClause += " PassengerRequest.vehicleTypeUniqueId = ?";
      queryParams.push(filters.vehicleTypeUniqueId);
      countParams.push(filters.vehicleTypeUniqueId);
    }

    // If isCompletionSeen is provided
    if (filters?.isCompletionSeen !== undefined) {
      whereClause += whereClause ? " AND " : " WHERE ";
      whereClause += " PassengerRequest.isCompletionSeen = ?";
      queryParams.push(filters.isCompletionSeen);
      countParams.push(filters.isCompletionSeen);
    }

    // Handle multiple journeyStatusIds
    if (filters?.journeyStatusIds && filters.journeyStatusIds.length > 0) {
      whereClause += whereClause ? " AND " : " WHERE ";

      if (filters.journeyStatusIds.length === 1) {
        // Single value for efficiency
        whereClause += " PassengerRequest.journeyStatusId = ?";
        queryParams.push(filters.journeyStatusIds[0]);
        countParams.push(filters.journeyStatusIds[0]);
      } else {
        // Multiple values using IN clause
        const placeholders = filters.journeyStatusIds.map(() => "?").join(",");
        whereClause += ` PassengerRequest.journeyStatusId IN (${placeholders})`;
        queryParams.push(...filters.journeyStatusIds);
        countParams.push(...filters.journeyStatusIds);
      }
    }

    if (filters?.passengerRequestBatchId) {
      whereClause += whereClause ? " AND " : " WHERE ";
      whereClause += " PassengerRequest.passengerRequestBatchId = ?";
      queryParams.push(filters.passengerRequestBatchId);
      countParams.push(filters.passengerRequestBatchId);
    }

    if (filters?.passengerRequestUniqueId) {
      whereClause += whereClause ? " AND " : " WHERE ";
      whereClause += " PassengerRequest.passengerRequestUniqueId = ?";
      queryParams.push(filters.passengerRequestUniqueId);
      countParams.push(filters.passengerRequestUniqueId);
    }

    // Add date range filters
    if (filters?.startDate && filters?.endDate) {
      whereClause += whereClause ? " AND " : " WHERE ";
      whereClause +=
        " PassengerRequest.shipperRequestCreatedAt BETWEEN ? AND ?";
      queryParams.push(filters.startDate, filters.endDate);
      countParams.push(filters.startDate, filters.endDate);
    } else if (filters?.startDate) {
      whereClause += whereClause ? " AND " : " WHERE ";
      whereClause += " PassengerRequest.shipperRequestCreatedAt >= ?";
      queryParams.push(filters.startDate);
      countParams.push(filters.startDate);
    } else if (filters?.endDate) {
      whereClause += whereClause ? " AND " : " WHERE ";
      whereClause += " PassengerRequest.shipperRequestCreatedAt <= ?";
      queryParams.push(filters.endDate);
      countParams.push(filters.endDate);
    }

    // Add sorting
    let orderBy = "ORDER BY PassengerRequest.passengerRequestId DESC";
    if (filters?.sortBy) {
      const validSortColumns = [
        "shipperRequestCreatedAt",
        "passengerRequestId",
        "originPlace",
        "destinationPlace",
        "fullName",
      ];
      const sortColumn = validSortColumns.includes(filters.sortBy)
        ? filters.sortBy
        : "passengerRequestId";
      const sortOrder =
        filters.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

      if (sortColumn === "fullName") {
        orderBy = `ORDER BY Users.fullName ${sortOrder}`;
      } else {
        orderBy = `ORDER BY PassengerRequest.${sortColumn} ${sortOrder}`;
      }
    }

    // Get paginated results - Include VehicleTypes join like original
    const sqlToGetRequests = `
      SELECT 
        PassengerRequest.*,
        Users.fullName,
        Users.email,
        Users.phoneNumber,
        VehicleTypes.vehicleTypeName
      FROM PassengerRequest 
      JOIN Users ON Users.userUniqueId = PassengerRequest.userUniqueId
      JOIN VehicleTypes ON VehicleTypes.vehicleTypeUniqueId = PassengerRequest.vehicleTypeUniqueId
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);

    const [passengerRequests] = await pool.query(sqlToGetRequests, queryParams);

    const sqlCount = `
      SELECT COUNT(*) as total 
      FROM PassengerRequest 
      JOIN Users ON Users.userUniqueId = PassengerRequest.userUniqueId
      JOIN VehicleTypes ON VehicleTypes.vehicleTypeUniqueId = PassengerRequest.vehicleTypeUniqueId
      ${whereClause}
    `;

    const [countResult] = await pool.query(sqlCount, countParams);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Format data with detailed journey information
    const formattedData = await getDetailedJourneyData(passengerRequests);

    return {
      message: "success",
      formattedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1,
        ...(userUniqueId && { userId: userUniqueId }),
      },
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  } catch (error) {
    const logger = require("../../Utils/logger");
    logger.error("Unable to update request", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError(
      "Unable to get passenger requests",
      error.statusCode || 500,
    );
  }
};

/**
 * Gets detailed journey data for passenger requests
 * @param {Array} passengerRequests - Array of passenger request objects
 * @returns {Promise<Array>} Array of detailed journey data
 */
const getDetailedJourneyData = async (passengerRequests) => {
  const {
    getData,
    performJoinSelect,
    getAttachedDocumentsByUserUniqueIdAndDocumentTypeId,
  } = require("../../CRUD/Read/ReadData");

  const processPassengerRequest = async (passengerRequest) => {
    const { journeyStatusId, passengerRequestId } = passengerRequest;

    if (journeyStatusId === journeyStatusMap.waiting) {
      return {
        passengerRequest,
        driverRequests: [],
        decisions: [],
        journey: {},
      };
    }

    // Determine which table to query
    const useJourneyDecisions = [
      journeyStatusMap.journeyStarted,
      journeyStatusMap.journeyCompleted,
    ].includes(journeyStatusId);

    // Get decisions
    const decisions = await getData({
      tableName: "JourneyDecisions",
      conditions: { passengerRequestId, journeyStatusId },
    });

    if (decisions.length === 0) {
      return {
        passengerRequest,
        driverRequests: [],
        decisions: [],
        journey: {},
      };
    }

    // Get driver requests
    const driverRequests = await Promise.all(
      decisions.map(async (decision) => {
        const driverResults = await performJoinSelect({
          baseTable: "DriverRequest",
          joins: [
            {
              table: "Users",
              on: "DriverRequest.userUniqueId = Users.userUniqueId",
            },
          ],
          conditions: {
            "DriverRequest.driverRequestId": decision.driverRequestId,
            "DriverRequest.journeyStatusId": journeyStatusId,
          },
        });

        const driverUserUniqueId = driverResults[0]?.userUniqueId;
        if (driverUserUniqueId) {
          const vehicleOfDriver = await performJoinSelect({
            baseTable: "Vehicle",
            joins: [
              {
                table: "VehicleDriver",
                on: "Vehicle.vehicleUniqueId = VehicleDriver.vehicleUniqueId",
              },
              {
                table: "VehicleTypes",
                on: "Vehicle.vehicleTypeUniqueId = VehicleTypes.vehicleTypeUniqueId",
              },
            ],
            conditions: {
              "VehicleDriver.driverUserUniqueId": driverUserUniqueId,
            },
            limit: 1,
          });

          // Get driver profile photo
          const documents =
            await getAttachedDocumentsByUserUniqueIdAndDocumentTypeId(
              driverUserUniqueId,
              listOfDocumentsTypeAndId.profilePhoto,
            );
          const data = documents?.data;
          const lastDataIndex = data?.length - 1;
          const driverProfilePhoto =
            data?.[lastDataIndex]?.attachedDocumentName;

          return (
            {
              ...driverResults[0],
              vehicleOfDriver: vehicleOfDriver?.[0],
              driverProfilePhoto,
            } || null
          );
        }
        return null;
      }),
    );

    // Get journey data if applicable
    let journey = {};
    if (useJourneyDecisions) {
      const journeyData = await getData({
        tableName: "Journey",
        conditions: {
          "Journey.journeyDecisionUniqueId":
            decisions[0].journeyDecisionUniqueId,
        },
      });
      journey = journeyData[0] || {};
    }

    return {
      passengerRequest,
      // Get all non null driverRequests values only
      driverRequests: driverRequests.filter((driverRequest) =>
        Boolean(driverRequest),
      ),
      decisions: decisions.filter((decision) => Boolean(decision)),
      journey,
    };
  };

  return Promise.all(passengerRequests?.map(processPassengerRequest));
};

/**
 * Updates a passenger request by ID
 * @param {number} requestId - Passenger request ID
 * @param {Object} updates - Update values
 * @returns {Promise<Object>} Success or error response
 */
const updateRequestById = async (requestId, updates) => {
  try {
    const result = await updateData({
      tableName: "PassengerRequest",
      conditions: { passengerRequestId: requestId },
      updateValues: updates,
    });

    if (result.affectedRows === 0) {
      throw new AppError("Request not found or no changes made", 404);
    }

    return { message: "success", data: "Request updated successfully" };
  } catch (error) {
    const logger = require("../../Utils/logger");
    logger.error("Unable to update request", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError("Unable to update request", error.statusCode || 500);
  }
};

/**
 * Deletes a passenger request by ID
 * @param {number} requestId - Passenger request ID
 * @returns {Promise<Object>} Success or error response
 */
const deleteRequest = async (requestId) => {
  try {
    const result = await deleteData({
      tableName: "PassengerRequest",
      conditions: { passengerRequestId: requestId },
    });

    if (result.affectedRows === 0) {
      throw new AppError("Request not found", 404);
    }

    return { message: "success", data: "Request deleted successfully" };
  } catch (error) {
    const logger = require("../../Utils/logger");
    logger.error("Unable to delete request", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError("Unable to delete request", error.statusCode || 500);
  }
};

/**
 * Get All Active Requests
 *
 * Purpose: Retrieves all active passenger requests (waiting, requested, acceptedByDriver)
 * for drivers to view available journeys.
 *
 * @param {Object} filters - Filtering options
 * @param {string} filters.userUniqueId - Filter by passenger user ID
 * @param {string} filters.email - Filter by passenger email (partial match)
 * @param {string} filters.phoneNumber - Filter by passenger phone (partial match)
 * @param {string} filters.fullName - Filter by passenger name (partial match)
 * @param {string} filters.vehicleTypeUniqueId - Filter by vehicle type
 * @param {number} filters.journeyStatusId - Filter by specific journey status
 * @param {string} filters.shippableItemName - Filter by item name (partial match)
 * @param {string} filters.originPlace - Filter by origin location (partial match)
 * @param {string} filters.destinationPlace - Filter by destination location (partial match)
 * @param {string} filters.startDate - Filter requests from this date
 * @param {string} filters.endDate - Filter requests until this date
 * @param {string} filters.shippingDate - Filter by shipping date
 * @param {string} filters.deliveryDate - Filter by delivery date
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Results per page (default: 2)
 * @param {string} filters.sortBy - Field to sort by (default: "requestTime")
 * @param {string} filters.sortOrder - Sort direction "ASC" or "DESC" (default: "DESC")
 * @returns {Promise<Object>} Response with data, pagination, and filters
 */
const getAllActiveRequests = async (filters = {}) => {
  const {
    // User filters
    userUniqueId,
    email,
    phoneNumber,
    fullName,

    // Request filters
    vehicleTypeUniqueId,
    journeyStatusId,
    shippableItemName,

    // Location filters
    originPlace,
    destinationPlace,

    // Date filters
    startDate,
    endDate,
    shippingDate,
    deliveryDate,

    // Pagination
    page = 1,
    limit = 2,

    // Sorting
    sortBy = "shipperRequestCreatedAt",
    sortOrder = "DESC",
  } = filters;

  const activeStatusIds = [
    journeyStatusMap.requested,
    journeyStatusMap.waiting,
    journeyStatusMap.acceptedByDriver,
  ];

  // Base query
  let baseQuery = `
    SELECT 
      pr.*, 
      u.fullName,
      u.phoneNumber,
      u.email,
      u.userCreatedAt as userCreatedAt,
      vt.vehicleTypeName,
      js.journeyStatusName  
    FROM PassengerRequest pr
    JOIN Users u ON u.userUniqueId = pr.userUniqueId 
    LEFT JOIN VehicleTypes vt ON pr.vehicleTypeUniqueId = vt.vehicleTypeUniqueId
    LEFT JOIN JourneyStatus js ON pr.journeyStatusId = js.journeyStatusId
    WHERE pr.journeyStatusId IN (?)
  `;

  let whereConditions = [];
  let values = [activeStatusIds];

  // User filters
  if (userUniqueId) {
    whereConditions.push("pr.userUniqueId = ?");
    values.push(userUniqueId);
  }

  if (email) {
    whereConditions.push("u.email LIKE ?");
    values.push(`%${email}%`);
  }

  if (phoneNumber) {
    whereConditions.push("u.phoneNumber LIKE ?");
    values.push(`%${phoneNumber}%`);
  }

  if (fullName) {
    whereConditions.push("u.fullName LIKE ?");
    values.push(`%${fullName}%`);
  }

  // Request filters
  if (vehicleTypeUniqueId) {
    whereConditions.push("pr.vehicleTypeUniqueId = ?");
    values.push(vehicleTypeUniqueId);
  }

  if (journeyStatusId) {
    whereConditions.push("pr.journeyStatusId = ?");
    values.push(journeyStatusId);
  }

  if (shippableItemName) {
    whereConditions.push("pr.shippableItemName LIKE ?");
    values.push(`%${shippableItemName}%`);
  }

  // Location filters
  if (originPlace) {
    whereConditions.push("pr.originPlace LIKE ?");
    values.push(`%${originPlace}%`);
  }

  if (destinationPlace) {
    whereConditions.push("pr.destinationPlace LIKE ?");
    values.push(`%${destinationPlace}%`);
  }

  // Date filters
  if (startDate && endDate) {
    whereConditions.push("pr.shipperRequestCreatedAt BETWEEN ? AND ?");
    values.push(startDate, endDate);
  } else if (startDate) {
    whereConditions.push("pr.shipperRequestCreatedAt >= ?");
    values.push(startDate);
  } else if (endDate) {
    whereConditions.push("pr.shipperRequestCreatedAt <= ?");
    values.push(endDate);
  }

  if (shippingDate) {
    whereConditions.push("DATE(pr.shippingDate) = ?");
    values.push(shippingDate);
  }

  if (deliveryDate) {
    whereConditions.push("DATE(pr.deliveryDate) = ?");
    values.push(deliveryDate);
  }

  // Add WHERE conditions to base query
  if (whereConditions.length > 0) {
    baseQuery += " AND " + whereConditions.join(" AND ");
  }

  // Count query for total records
  const countQuery = `SELECT COUNT(*) as totalCount FROM (${baseQuery}) as countTable`;

  // Add sorting and pagination to main query
  const offset = (page - 1) * limit;
  baseQuery += ` ORDER BY pr.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
  values.push(parseInt(limit), parseInt(offset));

  try {
    // Execute both queries
    const [countResults] = await pool.query(countQuery, values.slice(0, -2)); // Remove LIMIT and OFFSET values for count
    const [results] = await pool.query(baseQuery, values);

    const totalCount = countResults[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      status: "success",
      data: results,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        pageSize: parseInt(limit),
      },
      filters: {
        applied: whereConditions.length > 0 ? filters : {},
        activeStatusIds,
      },
    };
  } catch (error) {
    logger.error("Error in getAllActiveRequests", {
      error: error.message,
      stack: error.stack,
    });
    return {
      status: "error",
      error: "Unable to retrieve active ride requests",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }
};

module.exports = {
  createPassengerRequest,
  getPassengerRequestByPassengerRequestId,
  getPassengerRequest4allOrSingleUser,
  getDetailedJourneyData,
  updateRequestById,
  deleteRequest,
  getAllActiveRequests,
};
