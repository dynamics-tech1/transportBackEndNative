/**
 * Standardized error messages for consistent API responses
 */
const ERROR_MESSAGES = {
  // Generic errors
  INTERNAL_SERVER_ERROR: "An internal server error occurred",
  OPERATION_FAILED: "Operation failed",
  SOMETHING_WENT_WRONG: "Something went wrong",

  // Account related
  UNABLE_TO_VERIFY_REQUIREMENTS: "Unable to verify account requirements",

  // Document related
  UNABLE_TO_ACCEPT_REJECT_DOCUMENT: "Unable to accept or reject document",
  DOCUMENT_NOT_FOUND: "Document not found",

  // User related
  USER_NOT_FOUND: "User not found",
  USER_CREATION_FAILED: "User creation failed",
  FAILED_TO_RETRIEVE_USERS: "Failed to retrieve users",

  // Vehicle related
  FAILED_TO_CREATE_VEHICLE: "Failed to create vehicle",
  FAILED_TO_UPDATE_VEHICLE: "Failed to update vehicle",
  FAILED_TO_DELETE_VEHICLE: "Failed to delete vehicle",
  FAILED_TO_RETRIEVE_VEHICLES: "Failed to retrieve vehicles",

  // Status related
  STATUS_CREATION_FAILED: "Status creation failed",
  STATUS_UPDATE_FAILED: "Status update failed",
  STATUS_DELETION_FAILED: "Status deletion failed",
  FAILED_TO_RETRIEVE_STATUSES: "Failed to retrieve statuses",

  // Validation errors
  VALIDATION_FAILED: "Validation failed",
  MISSING_REQUIRED_FIELDS: "Missing required fields",

  // Authentication/Authorization
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
};

/**
 * Creates a standardized error response object
 * @param {string} errorMessage - The error message (use ERROR_MESSAGES constants)
 * @param {string} [code] - Optional error code
 * @param {Object} [details] - Optional error details
 * @returns {Object} Standardized error response object
 */
const createErrorResponse = (errorMessage, code = null, details = null) => {
  const response = {
    message: "error",
    error: errorMessage,
  };

  if (code) {
    response.code = code;
  }

  if (details) {
    response.details = details;
  }

  return response;
};

module.exports = {
  ERROR_MESSAGES,
  createErrorResponse,
};
