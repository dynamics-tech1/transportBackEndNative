class AppError extends Error {
  constructor(messageOrObj, statusCode) {
    let message;
    let code;
    let details;

    if (typeof messageOrObj === "object" && messageOrObj !== null) {
      message = messageOrObj.message;
      code = messageOrObj.code;
      details = messageOrObj.details || messageOrObj.errors; // handle both checks
    } else {
      message = messageOrObj;
    }

    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
