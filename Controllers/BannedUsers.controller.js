const bannedUsersService = require("../Services/BannedUsers.service");
const ServerResponder = require("../Utils/ServerResponder");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");

const banUser = async (req, res, next) => {
  try {
    const user = req.user;
    const data = {
      ...req.body,
      bannedBy: user.userUniqueId,
    };

    const result = await executeInTransaction(async () => {
      return await bannedUsersService.banUser(data);
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const getBannedUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const filters = { ...req.query, page, limit };

    const result = await bannedUsersService.getBannedUsers(filters);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const updateBannedUser = async (req, res, next) => {
  try {
    const { banUniqueId } = req.params;
    const data = req.body;

    const result = await executeInTransaction(async () => {
      return await bannedUsersService.updateBannedUser(banUniqueId, data);
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const unbanUser = async (req, res, next) => {
  try {
    const user = req?.user;

    const result = await executeInTransaction(async () => {
      return await bannedUsersService.unbanUser(req.query, user);
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const deactivateBan = async (req, res, next) => {
  try {
    const { banUniqueId } = req.params;

    const result = await executeInTransaction(async () => {
      return await bannedUsersService.deactivateBan(banUniqueId);
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  banUser,
  getBannedUsers,
  updateBannedUser,
  unbanUser,
  deactivateBan,
};
