const service = require("../Services/UserRefund.service");
const ServerResponder = require("../Utils/ServerResponder");

exports.createUserRefund = async (req, res, next) => {
  try {
    // userUniqueId is an id of user who will take refund money
    let userUniqueId = req?.params?.userUniqueId;
    const user = req?.user;
    const authenticatedUserUniqueId = user?.userUniqueId;

    if (userUniqueId === "self") {
      userUniqueId = authenticatedUserUniqueId;
    }

    const { refundAmount, refundReason, accountUniqueId } = req.body;
    const result = await service.createUserRefund({
      refundAmount,
      refundReason,
      userUniqueId,
      accountUniqueId,
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getUserRefunds = async (req, res, next) => {
  try {
    let {
      userRefundUniqueId,
      userUniqueId,
      refundStatus,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;
    const user = req?.user;

    // Handle "self" pattern in query
    if (userUniqueId === "self") {
      userUniqueId = user?.userUniqueId;
    }

    // Check if UUID is in params (for specific refund lookup)
    if (req.params?.userRefundUniqueId) {
      // Handle "self" pattern in params - treat as userUniqueId filter
      if (req.params.userRefundUniqueId === "self") {
        userUniqueId = user?.userUniqueId;
        userRefundUniqueId = undefined; // Don't search by UUID
      } else {
        userRefundUniqueId = req.params.userRefundUniqueId;
      }
    }

    const result = await service.getUserRefunds({
      userRefundUniqueId,
      userUniqueId,
      refundStatus,
      startDate,
      endDate,
      page,
      limit,
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.deleteRefundByUniqueId = async (req, res, next) => {
  try {
    const { userRefundUniqueId } = req.params;
    const result = await service.deleteRefundByUniqueId(userRefundUniqueId);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.updateUserRefundByUniqueId = async (req, res, next) => {
  try {
    const { userRefundUniqueId } = req.params;
    const result = await service.updateUserRefundByUniqueId(
      userRefundUniqueId,
      req.body,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
