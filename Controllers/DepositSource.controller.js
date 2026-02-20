const service = require("../Services/DepositSource.service");
const ServerResponder = require("../Utils/ServerResponder");
const AppError = require("../Utils/AppError");
const { usersRoles } = require("../Utils/ListOfSeedData");

// Helper function to check admin/super admin access
const checkAdminAccess = (user) => {
  const allowedRoles = [usersRoles.adminRoleId, usersRoles.supperAdminRoleId]; // 3 = Admin, 6 = Super Admin (adjust based on your role system)
  if (!user || !allowedRoles.includes(user.roleId)) {
    throw new AppError(
      "Access denied. you are not allowed to perform this action.",
      403,
    );
  }
};

exports.createDepositSource = async (req, res, next) => {
  try {
    checkAdminAccess(req.user);
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
    checkAdminAccess(req.user);
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
    checkAdminAccess(req.user);
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
