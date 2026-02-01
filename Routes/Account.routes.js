const express = require("express");
const router = express.Router();
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const AccountController = require("../Controllers/Account.controller");

// Account status: documents, vehicle and banned checks
// Account status: documents, vehicle and banned checks
// Since this is a simple GET with no params usually, we can skip explicit validator or add an empty query one
// to ensure no junk is passed if we want strictness.
router.get(
  "/api/account/status",
  verifyTokenOfAxios,
  AccountController?.accountStatus,
);

module.exports = router;
