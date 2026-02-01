const services = require("../Services/Role.service");
const ServerResponder = require("../Utils/ServerResponder");

const createRoleController = async (req, res, next) => {
  try {
    const user = req.user;
    req.body.user = user;
    const result = await services.createRole(req.body);
    return ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const getRoleController = async (req, res, next) => {
  try {
    const response = await services.getRole(req.params.roleUniqueId);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const updateRoleController = async (req, res, next) => {
  try {
    const user = req.user;
    req.body.user = user;
    const response = await services.updateRole(
      req.params.roleUniqueId,
      req.body,
    );
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const deleteRoleController = async (req, res, next) => {
  try {
    const user = req.user;
    const response = await services.deleteRole(req.params.roleUniqueId, user);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const getAllRolesController = async (req, res, next) => {
  try {
    const response = await services.getAllRoles(req.query);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoleController,
  getRoleController,
  updateRoleController,
  deleteRoleController,
  getAllRolesController,
};
