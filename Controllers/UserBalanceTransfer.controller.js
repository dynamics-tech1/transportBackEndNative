const service = require("../Services/UserBalanceTransfer.service");
const ServerResponder = require("../Utils/ServerResponder");

exports.createTransfer = async (req, res, next) => {
  try {
    const { fromDriverUniqueId, toDriverUniqueId, transferredAmount, reason } =
      req.body;
    let transferredBy = req?.params?.transferredBy;
    const user = req.user;
    const userUniqueId = user?.userUniqueId;
    if (transferredBy === "self") {
      transferredBy = userUniqueId;
    }

    const result = await service.createTransfer(
      fromDriverUniqueId,
      toDriverUniqueId,
      transferredAmount,
      reason,
      transferredBy,
    );

    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getAllTransfers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      fromDriverUniqueId,
      toDriverUniqueId,
      depositTransferUniqueId,
      sortBy = "transferTime",
      sortOrder = "DESC",
    } = req.query;

    const result = await service.getAllTransfers({
      page,
      limit,
      fromDriverUniqueId,
      toDriverUniqueId,
      depositTransferUniqueId,
      sortBy,
      sortOrder,
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getTransferByUniqueId = async (req, res, next) => {
  try {
    const { depositTransferUniqueId } = req.params;
    const result = await service.getTransferByUniqueId(depositTransferUniqueId);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getTransfersByFromDriverId = async (req, res, next) => {
  try {
    const { fromDriverUniqueId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const result = await service.getTransfersByFromDriverId(
      fromDriverUniqueId,
      { page, limit },
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getTransfersByToDriverId = async (req, res, next) => {
  try {
    const { toDriverUniqueId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const result = await service.getTransfersByToDriverId(toDriverUniqueId, {
      page,
      limit,
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.updateTransferByUniqueId = async (req, res, next) => {
  try {
    const { depositTransferUniqueId } = req.params;
    const updateData = req.body;
    const user = req.user;
    const userUniqueId = user?.userUniqueId;

    const result = await service.updateTransferByUniqueId(
      depositTransferUniqueId,
      updateData,
      userUniqueId,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.deleteTransferByUniqueId = async (req, res, next) => {
  try {
    const { depositTransferUniqueId } = req.params;
    const result = await service.deleteTransferByUniqueId(
      depositTransferUniqueId,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
