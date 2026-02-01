const paymentStatusService = require("../Services/PaymentStatus.service");
const ServerResponder = require("../Utils/ServerResponder");

// Create a new payment status
exports.createPaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    const result = await paymentStatusService.createPaymentStatus({
      paymentStatus,
      user: req.user,
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get all payment statuses
exports.getAllPaymentStatuses = async (req, res, next) => {
  try {
    const result = await paymentStatusService.getAllPaymentStatuses(req.query);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Update a specific payment status by ID
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatusUniqueId } = req.params;
    const { paymentStatus } = req.body;
    const result = await paymentStatusService.updatePaymentStatus(
      paymentStatusUniqueId,
      { paymentStatus, user: req.user },
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Delete a specific payment status by ID
exports.deletePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatusUniqueId } = req.params;
    const result = await paymentStatusService.deletePaymentStatus(
      paymentStatusUniqueId,
      req.user,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
