const { redis } = require("../Config/redis.config");
const logger = require("./logger");

// Connect using the same Redis socket path
const redisClient = redis;
// for testing purposes only
const getAllSockets = async () => {
  if (!redisClient) {
    return null;
  }
  try {
    // SCAN all keys matching the pattern (e.g., "user:*" or "admin:*")
    const stream = redisClient.scanStream({
      match: "*:*", // Adjust pattern if needed (e.g., "user:*")
      count: 100, // Batch size
    });

    const sockets = [];
    try {
      for await (const keys of stream) {
        for (const key of keys) {
          try {
            const socketId = await redisClient.get(key);
            sockets.push({ key, socketId });
          } catch (getError) {
            logger.debug("Error getting socket from Redis", {
              key,
              error: getError.message,
            });
            // Skip this key if Redis error occurs
            continue;
          }
        }
      }
    } catch (streamError) {
      logger.warn("Redis stream error", {
        error: streamError.message,
        stack: streamError.stack,
      });
      // Redis stream error - return what we have so far
      return sockets.length > 0 ? sockets : null;
    }

    return sockets;
  } catch (error) {
    logger.error("Redis connection error in getAllSockets", {
      error: error.message,
      stack: error.stack,
    });
    // Redis connection error - return null gracefully
    return null;
  }
};

const setSocket = async (userType, identifier, socketId) => {
  if (!redisClient || redisClient.status !== "ready") {
    logger.debug("Redis not ready, skipping socket storage", {
      userType,
      identifier,
      status: redisClient?.status,
    });
    return null;
  }
  try {
    const key = `${userType}:${identifier}`;

    await redisClient.set(key, socketId);
  } catch (error) {
    logger.error("Error setting socket in Redis", {
      userType,
      identifier,
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
};

const getSocket = async (userType, identifier) => {
  if (!redisClient || redisClient.status !== "ready") {
    logger.debug("Redis not ready, skipping socket retrieval", {
      userType,
      identifier,
      status: redisClient?.status,
    });
    return null;
  }
  try {
    const key = `${userType}:${identifier}`;

    const redisSocket = await redisClient.get(key);

    return redisSocket;
  } catch (error) {
    logger.error("Error getting socket from Redis", {
      userType,
      identifier,
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
};

const removeSocket = async (userType, identifier) => {
  if (!redisClient || redisClient.status !== "ready") {
    logger.debug("Redis not ready, skipping socket removal", {
      userType,
      identifier,
      status: redisClient?.status,
    });
    return;
  }
  try {
    const key = `${userType}:${identifier}`;
    await redisClient.del(key);
  } catch (error) {
    logger.error("Error removing socket from Redis", {
      userType,
      identifier,
      error: error.message,
      stack: error.stack,
    });
  }
};

module.exports = { getAllSockets, setSocket, getSocket, removeSocket };
