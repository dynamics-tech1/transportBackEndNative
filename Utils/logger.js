// Utils/logger.js
const winston = require("winston");
const { currentDate } = require("./CurrentDate");
const path = require("path");
const fs = require("fs");
const { combine, timestamp, json, printf, colorize, errors } = winston.format;

// Detect serverless environment (Vercel, AWS Lambda, etc.)
const isServerless =
  process.env.VERCEL === "1" ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.FUNCTION_NAME;

// Create logs directory (skip in serverless environments)
const logDir = path.join(__dirname, "../logs");
if (!isServerless) {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    // Silently fail if directory creation fails (e.g., read-only filesystem)
    console.warn("Could not create logs directory:", error.message);
  }
}

// Custom format for console (human-readable)
const consoleFormat = printf(
  ({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    if (stack) {
      log += `\n${stack}`;
    }

    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  },
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }), // Capture stack traces
    json(), // Default to JSON format
  ),
  defaultMeta: {
    service: "ride-hailing-api",
    environment: process.env.NODE_ENV || "development",
  },
  transports: isServerless
    ? [
        // In serverless environments, only use console transport
        // Vercel and other platforms capture console output automatically
        new winston.transports.Console({
          format: combine(
            colorize(),
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            printf(({ timestamp, level, message, stack, ...meta }) => {
              let log = `${timestamp} [${level}]: ${message}`;
              if (stack) {
                log += `\n${stack}`;
              }
              if (Object.keys(meta).length > 0) {
                log += `\n${JSON.stringify(meta, null, 2)}`;
              }
              return log;
            }),
          ),
        }),
      ]
    : [
        // Error logs (rotated daily)
        new winston.transports.File({
          filename: path.join(logDir, "error.log"),
          level: "error",
          maxsize: 5242880, // 5MB
          maxFiles: 10,
          tailable: true,
        }),

        // Combined logs (all levels)
        new winston.transports.File({
          filename: path.join(logDir, "combined.log"),
          maxsize: 5242880,
          maxFiles: 10,
          tailable: true,
        }),

        // Audit logs (for business events)
        new winston.transports.File({
          filename: path.join(logDir, "audit.log"),
          level: "info",
          maxsize: 5242880,
          maxFiles: 10,
          format: combine(
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            printf(({ timestamp, level, message, ...meta }) => {
              return JSON.stringify({
                timestamp,
                level,
                message,
                ...meta,
              });
            }),
          ),
        }),
      ],

  // Handle uncaught exceptions
  exceptionHandlers: isServerless
    ? [
        new winston.transports.Console({
          format: combine(
            colorize(),
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            printf(({ timestamp, level, message, stack, ...meta }) => {
              return `${timestamp} [${level}]: ${message}\n${
                stack || ""
              }\n${JSON.stringify(meta, null, 2)}`;
            }),
          ),
        }),
      ]
    : [
        new winston.transports.File({
          filename: path.join(logDir, "exceptions.log"),
          maxsize: 5242880,
          maxFiles: 5,
        }),
      ],

  // Handle unhandled rejections
  rejectionHandlers: isServerless
    ? [
        new winston.transports.Console({
          format: combine(
            colorize(),
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            printf(({ timestamp, level, message, stack, ...meta }) => {
              return `${timestamp} [${level}]: ${message}\n${
                stack || ""
              }\n${JSON.stringify(meta, null, 2)}`;
            }),
          ),
        }),
      ]
    : [
        new winston.transports.File({
          filename: path.join(logDir, "rejections.log"),
          maxsize: 5242880,
          maxFiles: 5,
        }),
      ],
});

// Add console transport for development (skip if already added for serverless)
if (!isServerless && process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "HH:mm:ss" }),
        consoleFormat,
      ),
      level: "debug",
    }),
  );
}

// Custom log methods for your application
class ApplicationLogger {
  // API Request logging
  static apiRequest(req, res, responseTime) {
    logger.info("API Request", {
      type: "API_REQUEST",
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: req.user?.userId,
      userUniqueId: req.user?.userUniqueId,
    });
  }

  // API Error logging
  static apiError(error, req) {
    logger.error("API Error", {
      type: "API_ERROR",
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.userId,
      userUniqueId: req.user?.userUniqueId,
      body: this.sanitizeData(req.body),
      params: req.params,
      query: req.query,
    });
  }

  // Database operations
  static databaseQuery(query, params, duration, userId = null) {
    if (process.env.NODE_ENV === "development") {
      logger.debug("Database Query", {
        type: "DB_QUERY",
        query: this.sanitizeQuery(query),
        params: params,
        duration: `${duration}ms`,
        userId,
      });
    }
  }

  static databaseError(error, query, params) {
    logger.error("Database Error", {
      type: "DB_ERROR",
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      query: this.sanitizeQuery(query),
      params: this.sanitizeData(params),
    });
  }

  // Business events
  static commissionCreated(commissionData, userId) {
    logger.info("Commission Created", {
      type: "COMMISSION_CREATED",
      commissionId: commissionData.commissionUniqueId,
      amount: commissionData.commissionAmount,
      journeyDecisionId: commissionData.journeyDecisionUniqueId,
      createdBy: userId,
      timestamp: currentDate(),
    });
  }

  static paymentProcessed(paymentData, userId) {
    logger.info("Payment Processed", {
      type: "PAYMENT_PROCESSED",
      paymentId: paymentData.paymentUniqueId,
      amount: paymentData.paymentAmount,
      status: paymentData.paymentStatus,
      userId,
      timestamp: currentDate(),
    });
  }

  // User actions
  static userLogin(userId, success, ip, userAgent) {
    const level = success ? "info" : "warn";
    logger.log(level, "User Login Attempt", {
      type: "USER_LOGIN",
      userId,
      success,
      ip,
      userAgent,
      timestamp: currentDate(),
    });
  }

  // Security events
  static securityEvent(event, details) {
    logger.warn("Security Event", {
      type: "SECURITY_EVENT",
      event,
      ...details,
      timestamp: currentDate(),
    });
  }

  // Helper methods
  static sanitizeData(data) {
    if (!data || typeof data !== "object") {
      return data;
    }

    // Handle circular references
    const seen = new WeakSet();
    const sanitized = JSON.parse(
      JSON.stringify(data, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      }),
    );

    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "creditCard",
      "ssn",
      "cvv",
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  static sanitizeQuery(query) {
    if (process.env.NODE_ENV === "production") {
      // In production, only log query structure, not values
      return query
        .replace(/'.*?'/g, "'[REDACTED]'")
        .replace(/\b\d+\b/g, "[NUMBER]");
    }
    return query;
  }
}

// Add application methods to logger
logger.application = ApplicationLogger;

// Export for use in other files
module.exports = logger;
