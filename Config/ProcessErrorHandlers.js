/**
 * Process-level error handlers
 * Handles unhandled rejections and uncaught exceptions at the Node.js process level
 */

const logger = require("../Utils/logger");

/**
 * Checks if an error is related to Redis connection issues
 * @param {Error} err - The error object
 * @returns {boolean} - True if it's a Redis-related error
 */
const isRedisError = (err) => {
  return (
    err.name === "MaxRetriesPerRequestError" ||
    err.name === "ConnectionError" ||
    err.message?.includes("Redis") ||
    err.message?.includes("redis") ||
    err.message?.includes("max retries") ||
    err.message?.includes("Stream isn't writeable") ||
    err.message?.includes("enableOfflineQueue") ||
    err.message?.includes("ECONNREFUSED") ||
    err.message?.includes("ETIMEDOUT") ||
    err.message?.includes("connection timeout") ||
    err.message?.includes("client connection timeout") ||
    err.message?.includes("Pub client") ||
    err.message?.includes("Sub client") ||
    err.code === "ECONNREFUSED" ||
    err.code === "ETIMEDOUT"
  );
};

/**
 * Sets up process-level error handlers
 * @param {Object} options - Configuration options
 * @param {Object} options.server - HTTP server instance (optional, for graceful shutdown)
 */
const setupProcessErrorHandlers = ({ server = null } = {}) => {
  // Handle unhandled Promise rejections
  process.on("unhandledRejection", (err, promise) => {
    logger.error("UNHANDLED REJECTION", {
      name: err.name,
      message: err.message,
      stack: err.stack,
      promise: promise?.toString(),
    });

    // Don't crash on Redis connection errors - these are expected when Redis is unavailable
    if (isRedisError(err)) {
      logger.warn(
        "Redis connection error detected - continuing without Redis",
        {
          error: err.message,
          name: err.name,
          code: err.code,
        }
      );
      return; // Don't exit - let the app continue
    }

    // For other critical errors, still exit
    logger.error("Critical unhandled rejection - shutting down", {
      name: err.name,
      message: err.message,
    });

    if (server) {
      server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    logger.error("UNCAUGHT EXCEPTION", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });
};

module.exports = { setupProcessErrorHandlers, isRedisError };
