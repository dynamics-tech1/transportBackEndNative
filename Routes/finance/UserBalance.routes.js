const express = require("express");
const router = express.Router();
const userBalanceController = require("../../Controllers/UserBalance.controller");
const { verifyTokenOfAxios } = require("../../Middleware/VerifyToken");

const { validator } = require("../../Middleware/Validator");
const {
  createUserBalance,
  balanceParams,
} = require("../../Validations/UserBalance.schema");

// Create a new driver balance record
router.post(
  "/",
  verifyTokenOfAxios,
  validator(createUserBalance),
  userBalanceController.createUserBalance,
);

// Unified GET endpoint with filters and pagination
router.get(
  "/",
  verifyTokenOfAxios,
  userBalanceController.getUserBalanceByFilter,
);

// Update a driver balance record by ID
router.put(
  "/:userBalanceUniqueId",
  verifyTokenOfAxios,
  validator(balanceParams, "params"),
  userBalanceController.updateUserBalance,
);

// Delete a driver balance record by ID
router.delete(
  "/:userBalanceUniqueId",
  verifyTokenOfAxios,
  validator(balanceParams, "params"),
  userBalanceController.deleteUserBalance,
);
module.exports = router;
