const userRoleService = require("../Services/UserRole.service");
const ServerResponder = require("../Utils/ServerResponder");

const createUserRole = async (req, res, next) => {
  try {
    const result = await userRoleService.createUserRole(req.body, req.user);
    ServerResponder(res, result); // Respond with 201 Created
  } catch (error) {
    next(error);
  }
};

const getUserRoleListByFilter = async (req, res, next) => {
  try {
    const { page, limit, sortBy, sortOrder, search, ...rest } = req.query || {};

    // Treat any query params other than reserved ones as column filters
    const reserved = new Set([
      "page",
      "limit",
      "sortBy",
      "sortOrder",
      "search",
    ]);
    const filters = {};
    for (const [k, v] of Object.entries(rest || {})) {
      if (!reserved.has(k)) {
        filters[k] = v;
      }
    }

    const response = await userRoleService.getUserRoleListByFilter({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      filters,
    });
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};
const updateUserRole = async (req, res, next) => {
  try {
    const result = await userRoleService.updateUserRole(
      req.params.userRoleUniqueId,
      req.body,
    );
    ServerResponder(res, result);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const deleteUserRole = async (req, res, next) => {
  try {
    const result = await userRoleService.deleteUserRole(
      req.params.userRoleUniqueId,
    );
    ServerResponder(res, result);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserRoleListByFilter,
  createUserRole,
  updateUserRole,
  deleteUserRole,
};
