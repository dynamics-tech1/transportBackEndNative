const commissionStatusService = require("../Services/CommissionStatus.service");
const ServerResponder = require("../Utils/ServerResponder");

exports.createCommissionStatus = async (req, res, next) => {
  try {
    const result = await commissionStatusService.createCommissionStatus({
      ...req.body,
      user: req.user,
    });
    ServerResponder(res, result, 201);
  } catch (error) {
    next(error);
  }
};

exports.getAllCommissionStatuses = async (req, res, next) => {
  try {
    const result = await commissionStatusService.getAllCommissionStatuses(
      req.query,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.updateCommissionStatus = async (req, res, next) => {
  try {
    const result = await commissionStatusService.updateCommissionStatus(
      req.params.id,
      req.body,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.deleteCommissionStatus = async (req, res, next) => {
  try {
    const result = await commissionStatusService.deleteCommissionStatus(
      req.params.id,
      req.user.userUniqueId,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
