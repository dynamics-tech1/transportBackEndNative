const service = require("../Services/UserDeposit.service");
const { currentDate } = require("../Utils/CurrentDate");
const ServerResponder = require("../Utils/ServerResponder");

// Create
exports.createUserDeposit = async (req, res, next) => {
  try {
    const driverUniqueId = req?.user?.userUniqueId;
    req.body.driverUniqueId = driverUniqueId;
    req.body.userDepositCreatedBy = driverUniqueId;
    const depositTime = currentDate();
    req.body.depositTime = depositTime;
    const result = await service.createUserDeposit(req.body);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getUserDeposit = async (req, res, next) => {
  try {
    const query = req.query;

    let driverUniqueId = req?.query?.driverUniqueId;
    if (driverUniqueId === "self") {
      driverUniqueId = req?.user?.userUniqueId;
    }
    const filter = {
      ...query,
      driverUniqueId,
      page: parseInt(query?.page) || 1,
      limit: parseInt(query?.limit) || 10,
      sortBy: query?.sortBy || "depositTime",
      sortOrder: query?.sortOrder || "DESC",
    };

    const result = await service.getUserDeposit({
      ...filter,
    });

    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Update
exports.updateUserDepositByUniqueId = async (req, res, next) => {
  try {
    const { userDepositUniqueId } = req.params;
    const result = await service.updateUserDepositByUniqueId(
      userDepositUniqueId,
      req.body,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Delete
exports.deleteUserDepositByUniqueId = async (req, res, next) => {
  try {
    const { userDepositUniqueId } = req.params;
    const result =
      await service.deleteUserDepositByUniqueId(userDepositUniqueId);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.initiateSantimPayPayment = async (req, res, next) => {
  try {
    const driverUniqueId = req?.user?.userUniqueId;
    const phoneNumber = req?.user?.phoneNumber;
    const { depositAmount } = req.body;

    if (!depositAmount || depositAmount <= 0) {
      const AppError = require("../Utils/AppError");
      throw new AppError("Valid deposit amount is required", 400);
    }

    if (!phoneNumber) {
      const AppError = require("../Utils/AppError");
      throw new AppError(
        "Phone number not found in user profile. Please update your profile.",
        400,
      );
    }

    const result = await service.initiateSantimPayPaymentService({
      driverUniqueId,
      depositAmount,
      phoneNumber: phoneNumber || "",
    });

    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.handleSantimPayWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const signedToken =
      req.headers["signed-token"] || req.headers["Signed-Token"];

    const result = await service.handleSantimPayWebhookService({
      webhookData,
      signedToken,
    });

    // Always return 200 to SantimPay to acknowledge receipt
    ServerResponder(res, result, 200);
  } catch (error) {
    // Still return 200 to prevent SantimPay from retrying, but log it locally if needed
    // or just return a controlled error response with 200
    ServerResponder(
      res,
      {
        status: "error",
        error: error.message || "Webhook processing failed",
      },
      200,
    );
  }
};
