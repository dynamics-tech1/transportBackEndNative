const express = require("express");
const {
  addCancellationReasons,
  deleteCancellationReasons,
  updateCancellationReasons,
  getAllCancellationReasons,
} = require("../Controllers/Cancellation.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const Router = express.Router();

const { validator } = require("../Middleware/Validator");
const {
  createCancellationReason,
  updateCancellationReason,
  cancellationReasonParams,
  getCancellationReasonsQuery,
} = require("../Validations/CancellationReasons.schema");

Router.post(
  "/api/admin/cancellationReasons",
  verifyTokenOfAxios,
  validator(createCancellationReason),
  addCancellationReasons,
);

Router.get(
  "/api/admin/cancellationReasons",
  verifyTokenOfAxios,
  validator(getCancellationReasonsQuery, "query"),
  getAllCancellationReasons,
);

Router.put(
  "/api/admin/cancellationReasons/:cancellationReasonTypeUniqueId",
  verifyTokenOfAxios,
  validator(cancellationReasonParams, "params"),
  validator(updateCancellationReason),
  updateCancellationReasons,
);

Router.delete(
  "/api/admin/cancellationReasons/:cancellationReasonTypeUniqueId",
  verifyTokenOfAxios,
  validator(cancellationReasonParams, "params"),
  deleteCancellationReasons,
);
module.exports = Router;
