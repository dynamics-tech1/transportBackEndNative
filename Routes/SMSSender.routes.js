const express = require("express");
const router = express.Router();
const smsSenderController = require("../Controllers/SmsSender.controller");

// Create a new SMS sender
const { validator } = require("../Middleware/Validator");
const {
  createSMSSender,
  updateSMSSender,
  smsSenderParams,
} = require("../Validations/SMSSender.schema");

// Create a new SMS sender
router.post(
  "/smsSender",
  validator(createSMSSender),
  smsSenderController.createSMSSender,
);

// Get all SMS senders
router.get("/smsSender", smsSenderController.getAllSMSSenders);

// Get a single SMS sender by ID
router.get(
  "/smsSender/:id",
  validator(smsSenderParams, "params"),
  smsSenderController.getSMSSenderById,
);

// Update an SMS sender by ID
router.put(
  "/smsSender/:id",
  validator(smsSenderParams, "params"),
  validator(updateSMSSender),
  smsSenderController.updateSMSSender,
);

// Delete an SMS sender by ID
router.delete(
  "/smsSender/:id",
  validator(smsSenderParams, "params"),
  smsSenderController.deleteSMSSender,
);

module.exports = router;
