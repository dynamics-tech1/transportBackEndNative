const bannedUsersService = require("../Services/BannedUsers.service");
const ServerResponder = require("../Utils/ServerResponder");

const handleServiceResponse = async (serviceCall, res, next) => {
  try {
    const result = await serviceCall;
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const banUser = async (req, res, next) => {
  const user = req.user;
  const data = {
    ...req.body,
    bannedBy: user.userUniqueId,
  };

  await handleServiceResponse(bannedUsersService.banUser(data), res, next);
};

const getBannedUsers = async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const filters = { ...req.query, page, limit };

  await handleServiceResponse(
    bannedUsersService.getBannedUsers(filters),
    res,
    next,
  );
};

const updateBannedUser = async (req, res, next) => {
  const { banUniqueId } = req.params;
  const data = req.body;

  await handleServiceResponse(
    bannedUsersService.updateBannedUser(banUniqueId, data),
    res,
    next,
  );
};

const unbanUser = async (req, res, next) => {
  const user = req?.user;

  await handleServiceResponse(
    bannedUsersService.unbanUser(req.query, user),
    res,
    next,
  );
};

const deactivateBan = async (req, res, next) => {
  const { banUniqueId } = req.params;

  await handleServiceResponse(
    bannedUsersService.deactivateBan(banUniqueId),
    res,
    next,
  );
};

module.exports = {
  banUser,
  getBannedUsers,
  updateBannedUser,
  unbanUser,
  deactivateBan,
};
