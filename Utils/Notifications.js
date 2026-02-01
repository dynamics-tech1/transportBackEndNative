const { emitMessage } = require("./WsServerResponder");
const { getSocket, getAllSockets } = require("./WsConnectionStore");
const { redis } = require("../Config/redis.config");
const logger = require("./logger");
const AppError = require("./AppError");

// Regular expression to validate phone numbers (only digits, between 9 and 15 digits)
const phoneNumberRegex = /^[0-9]{9,15}$/;

// Clean phone number by removing non-digit characters
const cleanPhoneNumber = (phoneNumber) => {
  return phoneNumber?.replace(/\D/g, "");
};

// 🔔 Notify a specific driver by phone number
const sendSocketIONotificationToDriver = async ({
  message,
  phoneNumber,
  eventName,
}) => {
  try {
    logger.debug("@sendSocketIONotificationToDriver", {
      messageTypes: message.messageTypes,
      phoneNumber,
    });

    const cleanedPhoneNumber = cleanPhoneNumber(phoneNumber);

    if (!phoneNumberRegex.test(cleanedPhoneNumber)) {
      throw new AppError("Invalid phone number format", 400);
    }

    const socketId = await getSocket("driver", cleanedPhoneNumber);
    getAllSockets();
    if (!socketId) {
      logger.warn("No active driver socket found for notification", {
        phoneNumber: cleanedPhoneNumber,
      });
      return {
        status: "success",
        message: "success",
        data: "Notification skipped: Driver offline",
      };
    }

    const res = await emitMessage({
      eventName: eventName || "messages",
      messageDetails: JSON.stringify(message),
      socketId,
    });

    if (res.status === "success" || res.message === "success") {
      return { status: "success", data: "Message sent to driver" };
    } else {
      throw new AppError("Failed to send message to driver", 500);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Error sending notification to driver", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError("Request can't be sent to driver", 500);
  }
};

// 🔔 Notify a specific passenger by phone number
const sendSocketIONotificationToPassenger = async ({
  message,
  phoneNumber,
  eventName,
}) => {
  try {
    const cleanedPhoneNumber = cleanPhoneNumber(phoneNumber);
    if (!phoneNumberRegex.test(cleanedPhoneNumber)) {
      throw new AppError("Invalid phone number format", 400);
    }

    const socketId = await getSocket("passenger", cleanedPhoneNumber);
    if (!socketId) {
      logger.warn("No active passenger socket found for notification", {
        phoneNumber: cleanedPhoneNumber,
      });
      return {
        status: "success",
        message: "success",
        data: "Notification skipped: Passenger offline",
      };
    }

    const res = await emitMessage({
      eventName: eventName || "messages",
      messageDetails: JSON.stringify(message),
      socketId,
    });
    if (res.status === "success" || res.message === "success") {
      return { status: "success", data: "Message sent to passenger" };
    } else {
      throw new AppError("Failed to send message to passenger", 500);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Error sending notification to passenger", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError("Message can't be sent to passenger", 500);
  }
};

const sendSocketIONotificationToAdmin = async ({ message, eventName }) => {
  if (!redis) {
    throw new AppError("Redis not available", 503);
  }
  try {
    let keys = [];
    try {
      keys = await redis.keys("admin:*");
    } catch (redisError) {
      logger.error("Redis connection error", {
        error: redisError.message,
        stack: redisError.stack,
      });
      throw new AppError(
        "Redis connection error - unable to send admin notifications",
        503,
      );
    }

    const successList = [];
    const errorList = [];

    for (const key of keys) {
      let socketId = null;
      try {
        socketId = await redis.get(key);
      } catch (redisError) {
        logger.error("Redis error while fetching socket", {
          key,
          error: redisError.message,
          stack: redisError.stack,
        });
        // Skip this key if Redis error occurs
        errorList.push({
          key,
          status: "error",
          detail: "Redis error while fetching socket",
        });
        continue;
      }

      if (!socketId) {
        continue;
      }

      try {
        const res = await emitMessage({
          eventName: eventName || "messages",
          messageDetails: JSON.stringify(message),
          socketId,
        });

        if (res.status === "success" || res.message === "success") {
          successList.push({
            socketId,
            status: "success",
            detail: "Message sent to admin",
          });
        } else {
          errorList.push({
            socketId,
            status: "error",
            detail: "Failed to send message to admin",
          });
        }
      } catch (err) {
        logger.error("Exception while sending to admin", {
          socketId,
          error: err.message,
          stack: err.stack,
        });
        errorList.push({
          socketId,
          status: "error",
          detail: "Exception while sending to admin",
        });
      }
    }

    if (successList.length === 0) {
      throw new AppError("No admin message was sent", 500);
    }

    return {
      status: "success",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Internal error sending notifications", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError("Internal error sending notifications", 500);
  }
};

module.exports = {
  sendSocketIONotificationToAdmin,
  sendSocketIONotificationToDriver,
  sendSocketIONotificationToPassenger,
};
