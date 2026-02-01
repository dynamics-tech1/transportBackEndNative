const AppError = require("../Utils/AppError");
const Joi = require("joi");
const logger = require("../Utils/logger");

const validator = (schema, source = "body") => {
  return (req, res, next) => {
    const data = req[source];
    logger.debug("@validator data", data);
    // Handle empty body for POST requests
    if (
      source === "body" &&
      req.method === "POST" &&
      (!data || Object.keys(data).length === 0)
    ) {
      //Request body cannot be empty
      return next(new AppError("Error happened", 400));
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    });
    logger.debug("@validator schema.validate error", error);
    if (error) {
      return next(
        new AppError(
          {
            message: "Validation failed",
            code: "VALIDATION_ERROR",
          },
          400,
        ),
      );
    }

    // Replace validated data
    req[source] = value;
    next();
  };
};

// Add UUID validation helper
const uuidSchema = Joi.string()
  .guid({
    version: ["uuidv4"],
  })
  .required();

module.exports = { validator, uuidSchema };
