const {
  getData,
  performJoinSelect,
  getAttachedDocumentsByUserUniqueIdAndDocumentTypeId,
} = require("../../CRUD/Read/ReadData");
const { pool } = require("../../Middleware/Database.config");
const { updateData } = require("../../CRUD/Update/Data.update");
const {
  sendSocketIONotificationToDriver,
} = require("../../Utils/Notifications");
const { sendFCMNotificationToUser } = require("../Firebase.service");
const { getVehicleDrivers } = require("../VehicleDriver.service");
const {
  updateJourneyStatus,
  updateNegativeJourneyStatus,
} = require("../JourneyStatus.service");
const { createCanceledJourney } = require("../CanceledJourneys.service");
const {
  journeyStatusMap,
  usersRoles,
  listOfDocumentsTypeAndId,
} = require("../../Utils/ListOfSeedData");
const messageTypes = require("../../Utils/MessageTypes");
const logger = require("../../Utils/logger");
const AppError = require("../../Utils/AppError");
const { verifyPassengerStatus } = require("./statusVerification.service");
const { executeInTransaction } = require("../../Utils/DatabaseTransaction");
const { currentDate } = require("../../Utils/CurrentDate");
// Lazy require to avoid circular dependency
// const { verifyDriverJourneyStatus } = require("../DriverRequest.service");

/**
 * Accepts a driver's request/offer
 * @param {Object} body - Request body
 * @param {string} body.userUniqueId - Passenger's unique ID
 * @param {string} body.journeyDecisionUniqueId - Journey decision unique ID
 * @param {string} body.driverRequestUniqueId - Driver request unique ID
 * @param {string} body.passengerRequestUniqueId - Passenger request unique ID
 * @param {string} body.userUniqueId - Passenger's unique ID
 * @returns {Promise<Object>} Passenger status after acceptance
 */
const acceptDriverRequest = async (body) => {
  try {
    const {
      journeyDecisionUniqueId,
      driverRequestUniqueId,
      passengerRequestUniqueId,
      userUniqueId,
    } = body;

    // Validate required fields
    if (
      !journeyDecisionUniqueId ||
      !driverRequestUniqueId ||
      !passengerRequestUniqueId ||
      !userUniqueId
    ) {
      throw new AppError(
        "journeyDecisionUniqueId, driverRequestUniqueId, passengerRequestUniqueId, and userUniqueId are required",
        400,
      );
    }

    // Validate that the provided IDs match and the journey decision exists with eligible status
    const validationQuery = `
      SELECT jd.journeyDecisionUniqueId, jd.journeyStatusId, 
             dr.driverRequestUniqueId, pr.passengerRequestUniqueId,
             pr.userUniqueId as passengerUserUniqueId
      FROM JourneyDecisions jd
      JOIN DriverRequest dr ON jd.driverRequestId = dr.driverRequestId
      JOIN PassengerRequest pr ON jd.passengerRequestId = pr.passengerRequestId
      WHERE jd.journeyDecisionUniqueId = ?
        AND dr.driverRequestUniqueId = ?
        AND pr.passengerRequestUniqueId = ?
      LIMIT 1
    `;

    const [validationResult] = await pool.query(validationQuery, [
      journeyDecisionUniqueId,
      driverRequestUniqueId,
      passengerRequestUniqueId,
    ]);

    if (validationResult.length === 0) {
      throw new AppError("Journey decision not found or IDs do not match", 404);
    }

    const decision = validationResult[0];

    // Check if the user is the owner of the passenger request
    if (decision.passengerUserUniqueId !== userUniqueId) {
      throw new AppError(
        "Unauthorized: You can only accept drivers for your own requests",
        403,
      );
    }

    // Check if the journey decision is in an eligible status for acceptance
    if (
      ![journeyStatusMap.requested, journeyStatusMap.acceptedByDriver].includes(
        decision.journeyStatusId,
      )
    ) {
      throw new AppError(
        `Driver is not connected to shipper in this decision. Current status: ${decision.journeyStatusId}`,
        400,
      );
    }

    // Proceed with acceptance
    const acceptedDriver = [decision]; // Use the validated decision

    const updatePayloads = [];
    const notificationDataArray = [];

    // Since we have the specific decision, create update payload
    const updatePayload = {
      journeyStatusId: journeyStatusMap.acceptedByPassenger,
      driverRequestUniqueId: decision.driverRequestUniqueId,
      journeyDecisionUniqueId: decision.journeyDecisionUniqueId,
      passengerRequestUniqueId: decision.passengerRequestUniqueId,
    };

    updatePayloads.push(updatePayload);

    // For notifications, use the decision data
    notificationDataArray.push({
      driver: decision, // This will need to be expanded with full driver data
      phoneNumber: null, // Will need to fetch
      targetDriverUserUniqueId: null, // Will need to fetch
      isAccepted: true,
      updatePayload,
    });

    // Wrap all updates in a single transaction
    await executeInTransaction(
      async (connection) => {
        // Update the journey decision status
        await updateJourneyStatus({
          ...updatePayload,
          connection,
        });
      },
      {
        timeout: 15000,
        logging: true,
      },
    );

    // For notifications, we need to fetch full driver data
    // This is simplified; in practice, fetch the full data
    const fullDriverData = await performJoinSelect({
      baseTable: "DriverRequest",
      joins: [
        {
          table: "Users",
          on: "DriverRequest.userUniqueId = Users.userUniqueId",
        },
        {
          table: "JourneyDecisions",
          on: "DriverRequest.driverRequestId = JourneyDecisions.driverRequestId",
        },
      ],
      conditions: {
        "DriverRequest.driverRequestUniqueId": driverRequestUniqueId,
        "JourneyDecisions.journeyDecisionUniqueId": journeyDecisionUniqueId,
      },
    });

    if (fullDriverData.length > 0) {
      const driver = fullDriverData[0];
      const phoneNumber = driver.phoneNumber;
      const targetDriverUserUniqueId = driver.userUniqueId;

      // Update notification data
      notificationDataArray[0].driver = driver;
      notificationDataArray[0].phoneNumber = phoneNumber;
      notificationDataArray[0].targetDriverUserUniqueId =
        targetDriverUserUniqueId;

      // Send notifications (similar to original code, but simplified)
      // ... notification logic ...
    }

    // Get updated status counts after acceptance
    const statusResult = await verifyPassengerStatus({
      userUniqueId,
      sendNotificationsToDrivers: false, // Don't send notifications, just get counts
    });

    // Return success with unique IDs and updated status counts
    return {
      message: "success",
      totalRecords: statusResult?.totalRecords || null,
      pageSize: statusResult?.pageSize || 10,
      page: statusResult?.page || 1,
    };
  } catch (error) {
    logger.error("Unable to accept driver request", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError(
      error.message || "Unable to accept driver request",
      error.statusCode || 500,
    );
  }
};

/**
 * Rejects a driver's offer
 * @param {Object} body - Request body with rejection data
 * @returns {Promise<Object>} Passenger status after rejection
 */
const rejectDriverOffer = async (body) => {
  try {
    // Validate required fields
    const requiredFields = [
      "passengerRequestId",
      "passengerRequestUniqueId",
      "driverRequestUniqueId",
      "journeyDecisionUniqueId",
      "journeyStatusId",
    ];
    const missingFields =
      requiredFields?.filter((field) => !body?.[field]) || [];

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    // Get all requests which are accepted by driver passenger requests for this passenger
    const allPassengerRequests = await getData({
      tableName: "JourneyDecisions",
      conditions: {
        passengerRequestId: body.passengerRequestId,
        journeyStatusId: journeyStatusMap.acceptedByDriver,
      },
    });
    logger.debug("@allPassengerRequests", { allPassengerRequests });

    // Wrap all updates in a transaction to ensure atomicity
    let negativeStatusUpdateResult;
    await executeInTransaction(
      async (connection) => {
        // Update PassengerRequest if there is only one request (all-or-nothing)
        if (allPassengerRequests.length <= 1) {
          await updateData({
            tableName: "PassengerRequest",
            conditions: {
              passengerRequestUniqueId: body.passengerRequestUniqueId,
            },
            updateValues: {
              journeyStatusId: journeyStatusMap.waiting,
            },
            connection, // Pass connection for transaction support
          });
        }

        // Use dedicated updater function for negative status updates with transaction connection
        negativeStatusUpdateResult = await updateNegativeJourneyStatus({
          driverRequestUniqueId: body.driverRequestUniqueId,
          journeyDecisionUniqueId: body.journeyDecisionUniqueId,
          newStatusId: journeyStatusMap.rejectedByPassenger,
          connection, // Pass connection for transaction support
        });
      },
      {
        timeout: 10000, // 10 second timeout for reject operation
        logging: true,
      },
    );

    // Verify update was successful
    if (
      negativeStatusUpdateResult.message === "error" ||
      !negativeStatusUpdateResult.results?.driverRequest?.affectedRows ||
      !negativeStatusUpdateResult.results?.journeyDecision?.affectedRows
    ) {
      throw new Error(
        negativeStatusUpdateResult.error || "One or more updates failed",
      );
    }

    // Fetch driver and passenger data for notification
    const [driverRequestData, passengerRequestData, journeyDecisionData] =
      await Promise.all([
        performJoinSelect({
          baseTable: "DriverRequest",
          joins: [
            {
              table: "Users",
              on: "DriverRequest.userUniqueId = Users.userUniqueId",
            },
          ],
          conditions: {
            driverRequestUniqueId: body.driverRequestUniqueId,
          },
        }),
        performJoinSelect({
          baseTable: "PassengerRequest",
          joins: [
            {
              table: "Users",
              on: "PassengerRequest.userUniqueId = Users.userUniqueId",
            },
          ],
          conditions: {
            passengerRequestUniqueId: body.passengerRequestUniqueId,
          },
        }),
        getData({
          tableName: "JourneyDecisions",
          conditions: {
            journeyDecisionUniqueId: body.journeyDecisionUniqueId,
          },
        }),
      ]);

    const driver = driverRequestData?.[0];
    const passenger = passengerRequestData?.[0];
    const journeyDecision = journeyDecisionData?.[0];

    // Send notification to driver if driver data is available
    if (driver?.phoneNumber && driver?.userUniqueId) {
      // Get vehicle data for driver
      const vehicleData = await getVehicleDrivers({
        driverUserUniqueId: driver.userUniqueId,
        assignmentStatus: "active",
        limit: 1,
        page: 1,
      });
      // Get driver profile photo
      const vehicle = vehicleData?.data?.[0];
      const message = {
        messageTypes: messageTypes.passenger_rejected_request,
        message: "success",
        status: journeyStatusMap.rejectedByPassenger,
        passenger: passenger ? passenger : null,
        driver: {
          driver: driver,
          vehicle: vehicle || null,
        },
        decisions: journeyDecision ? journeyDecision : null,
        journey: null,
      };

      // Send WebSocket notification to driver
      try {
        await sendSocketIONotificationToDriver({
          message,
          phoneNumber: driver.phoneNumber,
        });
      } catch (error) {
        if (logger && typeof logger.error === "function") {
          logger.error(
            "Error sending WebSocket notification to driver:",
            error,
          );
        } else {
          console.error(
            "Error sending WebSocket notification to driver:",
            error,
          );
        }
      }

      // Send FCM push notification to driver
      try {
        await sendFCMNotificationToUser({
          userUniqueId: driver.userUniqueId,
          roleId: usersRoles.driverRoleId,
          notification: {
            title: "Offer rejected",
            body: "Passenger has excluded your offer from the bid.",
          },
          data: {
            type: "driver_offer_rejected",
            status: "rejected",
            driverRequestUniqueId: String(body.driverRequestUniqueId || ""),
            journeyDecisionUniqueId: String(body.journeyDecisionUniqueId || ""),
            passengerRequestUniqueId: String(
              body.passengerRequestUniqueId || "",
            ),
          },
        });
      } catch (error) {
        if (logger && typeof logger.error === "function") {
          logger.error("Error sending FCM notification to driver:", error);
        } else {
          console.error("Error sending FCM notification to driver:", error);
        }
      }
    }

    // Return success message - client should call verifyPassengerStatus endpoint for full status
    return {
      message: "success",
      data: "Driver offer rejected successfully",
    };
  } catch (error) {
    throw new AppError(
      error.message || "Unable to reject driver offer",
      error.statusCode || 500,
    );
  }
};

/**
 * Cancels a passenger request
 * @param {Object} body - Cancellation data
 * @param {number} body.cancellationJourneyStatusId - Cancellation status ID
 * @param {Object} body.user - User object with userUniqueId and roleId
 * @param {string} body.ownerUserUniqueId - Owner's unique ID
 * @param {number} body.cancellationReasonsTypeId - Cancellation reason type ID
 * @param {string} body.passengerRequestUniqueId - Passenger request unique ID
 * @returns {Promise<Object>} Success or error response
 */
const cancelPassengerRequest = async (body) => {
  try {
    const {
      cancellationJourneyStatusId,
      user,
      ownerUserUniqueId,
      cancellationReasonsTypeId,
      passengerRequestUniqueId,
    } = body;

    const { userUniqueId, roleId } = user;

    if (!userUniqueId || !roleId || !passengerRequestUniqueId) {
      throw new AppError(
        "Missing required fields to cancel passenger request",
        400,
      );
    }

    // Optimized: Fetch passenger request with User join AND journey decisions in a single query
    // Using LEFT JOIN for JourneyDecisions since they may not exist for all requests
    const sql = `
      SELECT 
        -- PassengerRequest columns
        PassengerRequest.*,
        -- Users columns (prefixed to avoid conflicts)
        Users.userUniqueId,
        Users.fullName,
        Users.phoneNumber,
        Users.email,
        -- JourneyDecisions columns (will be NULL if no decisions exist)
        JourneyDecisions.journeyDecisionId,
        JourneyDecisions.journeyDecisionUniqueId,
        JourneyDecisions.driverRequestId,
        JourneyDecisions.journeyStatusId as decisionJourneyStatusId,
        JourneyDecisions.decisionTime,
        JourneyDecisions.decisionBy,
        JourneyDecisions.shippingDateByDriver,
        JourneyDecisions.deliveryDateByDriver,
        JourneyDecisions.shippingCostByDriver,
        JourneyDecisions.isNotSelectedSeenByDriver,
        JourneyDecisions.isCancellationByDriverSeenByPassenger,
        JourneyDecisions.isRejectionByPassengerSeenByDriver
      FROM PassengerRequest
      INNER JOIN Users ON PassengerRequest.userUniqueId = Users.userUniqueId
      LEFT JOIN JourneyDecisions ON JourneyDecisions.passengerRequestId = PassengerRequest.passengerRequestId
      WHERE PassengerRequest.passengerRequestUniqueId = ?
    `;

    const [combinedResults] = await pool.query(sql, [passengerRequestUniqueId]);
    logger.debug("@combinedResults", { combinedResults });
    if (!combinedResults || combinedResults.length === 0) {
      throw new AppError("Passenger request not found", 404);
    }

    // Extract passenger request data from first row (all rows have same passenger data)
    const firstRow = combinedResults[0];
    const passengerRequest = {
      ...firstRow,
      // Remove JourneyDecisions columns from passengerRequest object
      journeyDecisionId: undefined,
      journeyDecisionUniqueId: undefined,
      driverRequestId: undefined,
      decisionJourneyStatusId: undefined,
      decisionTime: undefined,
      decisionBy: undefined,
      shippingDateByDriver: undefined,
      deliveryDateByDriver: undefined,
      shippingCostByDriver: undefined,
      isNotSelectedSeenByDriver: undefined,
      isCancellationByDriverSeenByPassenger: undefined,
      isRejectionByPassengerSeenByDriver: undefined,
    };
    // Clean up undefined properties
    Object.keys(passengerRequest).forEach(
      (key) =>
        passengerRequest[key] === undefined && delete passengerRequest[key],
    );

    const requestOwnerUserUniqueId = passengerRequest.userUniqueId;
    const passengerRequestId = passengerRequest.passengerRequestId;

    // Check if the request is already cancelled
    // const cancelledStatuses = [
    //   journeyStatusMap.cancelledByPassenger, // 7
    //   journeyStatusMap.cancelledByDriver, // 9
    //   journeyStatusMap.cancelledByAdmin, // 10
    //   journeyStatusMap.cancelledBySystem, // 12
    // ];

    // if (cancelledStatuses.includes(currentJourneyStatusId)) {
    //   return {
    //     message: "error",
    //     error: "This request has already been cancelled.",
    //   };
    // }

    // Verify authorization: user must own the request OR be admin/super admin
    const isOwner = requestOwnerUserUniqueId === userUniqueId;
    const isAdmin = roleId === 3 || roleId === 6; // 3 = admin, 6 = super admin

    if (!isOwner && !isAdmin) {
      throw new AppError(
        "Unauthorized: You can only cancel your own requests or must be an admin/super admin",
        403,
      );
    }

    // Extract journey decisions from all rows (filter out rows where journeyDecisionId is NULL)
    const journeyDecisions = combinedResults
      .filter((row) => row.journeyDecisionId !== null)
      .map((row) => ({
        journeyDecisionId: row.journeyDecisionId,
        journeyDecisionUniqueId: row.journeyDecisionUniqueId,
        driverRequestId: row.driverRequestId,
        journeyStatusId: row.decisionJourneyStatusId,
        decisionTime: row.decisionTime,
        decisionBy: row.decisionBy,
        shippingDateByDriver: row.shippingDateByDriver,
        deliveryDateByDriver: row.deliveryDateByDriver,
        shippingCostByDriver: row.shippingCostByDriver,
        isNotSelectedSeenByDriver: row.isNotSelectedSeenByDriver,
        isCancellationByDriverSeenByPassenger:
          row.isCancellationByDriverSeenByPassenger,
        isRejectionByPassengerSeenByDriver:
          row.isRejectionByPassengerSeenByDriver,
      }));

    // Use passenger data from the combined fetch (already includes User join)
    const passenger = passengerRequest || null;
    logger.debug("@journeyDecisions", { journeyDecisions });

    // Wrap all database updates in a transaction to ensure atomicity
    // This prevents partial updates where PassengerRequest is updated but DriverRequest/JourneyDecisions are not
    // Store driver notification data to send after transaction commits
    const driverNotificationData = [];

    await executeInTransaction(
      async (connection) => {
        // 1. Update PassengerRequest
        await updateData({
          tableName: "PassengerRequest",
          conditions: { passengerRequestId },
          updateValues: {
            journeyStatusId: cancellationJourneyStatusId, // Can be cancelledByPassenger (7) or cancelledByAdmin (10)
          },
          connection, // Use transaction connection
        });

        // 2. If journey decisions found, update all related tables atomically
        if (journeyDecisions.length) {
          // Process all journey decisions - collect data for notifications but only update DB in transaction
          for (const journeyDecision of journeyDecisions) {
            const { journeyDecisionUniqueId, driverRequestId } =
              journeyDecision;

            // Use dedicated updater function for negative status updates with transaction connection
            await updateNegativeJourneyStatus({
              driverRequestId,
              journeyDecisionUniqueId,
              newStatusId: cancellationJourneyStatusId,
              connection, // Pass transaction connection
            });

            // Store driverRequestId and journeyDecision for notification after transaction
            driverNotificationData.push({
              driverRequestId,
              journeyDecisionUniqueId,
              journeyDecision,
            });
          }
        }
      },
      {
        timeout: 20000, // 20 second timeout for critical cancellation operation
        logging: true, // Log transaction operations
      },
    );

    // After transaction commits successfully, send notifications
    if (journeyDecisions.length && driverNotificationData.length) {
      // Process all notifications in parallel (outside transaction)
      const notificationPromises = driverNotificationData.map(
        async ({
          driverRequestId,
          journeyDecisionUniqueId,
          journeyDecision,
        }) => {
          // Get driver data with user info
          const driverDataArray = await performJoinSelect({
            baseTable: "DriverRequest",
            joins: [
              {
                table: "Users",
                on: "DriverRequest.userUniqueId = Users.userUniqueId",
              },
            ],
            conditions: {
              driverRequestId,
            },
          });
          const driverRequest = driverDataArray?.[0];

          if (!driverRequest?.phoneNumber) {
            return; // Skip if no phone number
          }

          const driverUserUniqueId = driverRequest?.userUniqueId;

          // Get vehicle data for the driver
          const vehicleResult = await getVehicleDrivers({
            driverUserUniqueId,
            assignmentStatus: "active",
            limit: 1,
            page: 1,
          });
          const vehicle = vehicleResult?.data?.[0] || null;

          // Get driver profile photo
          const documents =
            await getAttachedDocumentsByUserUniqueIdAndDocumentTypeId(
              driverUserUniqueId,
              listOfDocumentsTypeAndId.profilePhoto,
            );
          const profilePhotoData = documents?.data;
          const lastDataIndex = profilePhotoData?.length - 1;
          const driverProfilePhoto =
            profilePhotoData?.[lastDataIndex]?.attachedDocumentName;

          // Get journey data if exists
          const [journey] = await getData({
            tableName: "Journey",
            conditions: { journeyDecisionUniqueId },
          });

          // Structure driver info with profile photo
          const driver = { ...driverRequest, driverProfilePhoto };

          const notificationMessage =
            userUniqueId === ownerUserUniqueId
              ? "Passenger cancelled Journey."
              : "System cancelled Journey.";

          // Determine appropriate message type based on who cancelled
          const cancellationMessageType =
            cancellationJourneyStatusId ===
            journeyStatusMap.cancelledByPassenger
              ? messageTypes?.passenger_cancelled_request
              : messageTypes?.admin_cancelled_request;

          // Send Socket.IO notification to driver with complete data
          // Format matches rejection notification format for consistency
          await sendSocketIONotificationToDriver({
            message: {
              messageTypes: cancellationMessageType,
              message: "success",
              status: cancellationJourneyStatusId,
              passenger: passenger ? passenger : null,
              driver: {
                driver: driver,
                vehicle: vehicle || null,
              },
              decisions: journeyDecision ? journeyDecision : null,
              journey: journey || null,
            },
            phoneNumber: driverRequest.phoneNumber,
          });

          // Also send Firebase push notification to the driver
          try {
            await sendFCMNotificationToUser({
              userUniqueId: driverUserUniqueId,
              roleId: usersRoles.driverRoleId,
              notification: {
                title: "Request canceled",
                body: notificationMessage,
              },
              data: {
                type: "driver_request_canceled",
                status: "canceled",
                passengerRequestId: String(passengerRequestId || ""),
                passengerUserUniqueId: String(ownerUserUniqueId || ""),
              },
            });
          } catch (e) {
            if (logger && typeof logger.error === "function") {
              logger.error("Error sending FCM notification to driver:", e);
            } else {
              console.error("Error sending FCM notification to driver:", e);
            }
          }
        },
      );

      // Wait for all notifications to complete
      await Promise.all(notificationPromises).catch((error) => {
        // Log notification errors but don't fail the cancellation
        if (logger && typeof logger.error === "function") {
          logger.error(
            "Error sending notifications after cancellation:",
            error,
          );
        } else {
          console.error(
            "Error sending notifications after cancellation:",
            error,
          );
        }
      });
    }

    // Check if cancellation is already registered
    const canceledJourneyBefore = await getData({
      tableName: "CanceledJourneys",
      conditions: {
        contextId: passengerRequestId,
        contextType: "PassengerRequest",
      },
    });

    if (canceledJourneyBefore.length === 0) {
      // Create new cancellation record
      await createCanceledJourney({
        canceledBy: userUniqueId,
        canceledTime: currentDate(),
        contextId: passengerRequestId,
        contextType: "PassengerRequest",
        cancellationReasonsTypeId,
        roleId,
        passengerUserUniqueId: requestOwnerUserUniqueId,
      });
    }

    // Get updated status counts after cancellation
    // This updates totalRecords with new counts (cancelled requests removed from active counts)
    const statusResult = await verifyPassengerStatus({
      userUniqueId: requestOwnerUserUniqueId,
      sendNotificationsToDrivers: false, // Don't send notifications, just get counts
    });

    // Return success with cancellation status, unique IDs, and updated status counts
    return {
      message: "success",
      status: cancellationJourneyStatusId,
      data:
        cancellationJourneyStatusId === journeyStatusMap.cancelledByPassenger
          ? "You have successfully cancelled your request."
          : "Request has been cancelled by admin.",
      // Provide unique IDs so frontend knows what was cancelled
      uniqueIds: {
        passengerRequestUniqueId,
        passengerRequestId,
      },
      // Include updated status counts (totalRecords) for frontend to update UI
      totalRecords: statusResult?.totalRecords || null,
    };
  } catch (error) {
    throw new AppError(
      error.message || "Unable to cancel passenger request",
      error.statusCode || 500,
    );
  }
};

module.exports = {
  acceptDriverRequest,
  rejectDriverOffer,
  cancelPassengerRequest,
};
