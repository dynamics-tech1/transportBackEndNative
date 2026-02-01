const service = require("../Services/DepositSource.service");
const ServerResponder = require("../Utils/ServerResponder");

exports.createDepositSource = async (req, res, next) => {
  try {
    const { sourceKey, sourceLabel } = req.body;
    const result = await service.createDepositSource({
      sourceKey,
      sourceLabel,
      user: req.user,
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getAllDepositSources = async (req, res, next) => {
  try {
    const result = await service.getAllDepositSources();
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getDepositSourceByUniqueId = async (req, res, next) => {
  try {
    const { depositSourceUniqueId } = req.params;
    const result = await service.getDepositSourceByUniqueId(
      depositSourceUniqueId,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.updateDepositSourceByUniqueId = async (req, res, next) => {
  try {
    const { depositSourceUniqueId } = req.params;
    const result = await service.updateDepositSourceByUniqueId(
      depositSourceUniqueId,
      req.body,
      req.user,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.deleteDepositSourceByUniqueId = async (req, res, next) => {
  try {
    const { depositSourceUniqueId } = req.params;
    const result = await service.deleteDepositSourceByUniqueId(
      depositSourceUniqueId,
      req.user,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
