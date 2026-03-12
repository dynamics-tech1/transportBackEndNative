const adminServices = require("../Services/Admin.service");
const ServerResponder = require("../Utils/ServerResponder");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");

const AdminController = {
  // Fetch online drivers

  getOfflineDrivers: async (req, res, next) => {
    try {
      const result = await executeInTransaction(async () => {
        return await adminServices.getOfflineDrivers(req);
      });
      ServerResponder(res, result);
    } catch (error) {
      next(error);
    }
  },

  getOnlineDrivers: async (req, res, next) => {
    try {
      const result = await executeInTransaction(async () => {
        return await adminServices.getOnlineDrivers(req);
      });
      ServerResponder(res, result);
    } catch (error) {
      next(error);
    }
  },

  getAllActiveDrivers: async (req, res, next) => {
    try {
      const result = await executeInTransaction(async () => {
        return await adminServices.getAllActiveDrivers(req);
      });
      ServerResponder(res, result);
    } catch (error) {
      next(error);
    }
  },

  getUnAuthorizedDriver: async (req, res, next) => {
    try {
      ServerResponder(
        res,
        await executeInTransaction(async () => {
          return await adminServices.getUnauthorizedDriver(
            req?.query,
          );
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AdminController;
