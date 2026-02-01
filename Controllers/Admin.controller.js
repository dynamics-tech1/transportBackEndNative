const adminServices = require("../Services/Admin.service");
const ServerResponder = require("../Utils/ServerResponder");

const AdminController = {
  // Fetch online drivers

  getOfflineDrivers: async (req, res, next) => {
    try {
      ServerResponder(res, await adminServices.getOfflineDrivers(req));
    } catch (error) {
      next(error);
    }
  },

  getOnlineDrivers: async (req, res, next) => {
    try {
      ServerResponder(res, await adminServices.getOnlineDrivers(req));
    } catch (error) {
      next(error);
    }
  },

  getAllActiveDrivers: async (req, res, next) => {
    try {
      ServerResponder(res, await adminServices.getAllActiveDrivers(req));
    } catch (error) {
      next(error);
    }
  },

  getUnAuthorizedDriver: async (req, res, next) => {
    try {
      ServerResponder(
        res,
        await adminServices.getUnauthorizedDriver(req?.query),
      );
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AdminController;
