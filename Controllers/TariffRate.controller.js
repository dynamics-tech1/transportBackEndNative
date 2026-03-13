const tariffRateService = require("../Services/TariffRate.service");
const ServerResponder = require("../Utils/ServerResponder");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");

// Create a new tariff rate
exports.createTariffRate = async (req, res, next) => {
  try {
    const user = req.user;
    req.body.user = user;
    const result = await executeInTransaction(async () => {
      return await tariffRateService.createTariffRate(req.body);
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get tariff rates with filtering and pagination
exports.getTariffRatesByFilter = async (req, res, next) => {
  try {
    const result = await tariffRateService.getTariffRatesByFilter(req.query);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Update a tariff rate by ID
exports.updateTariffRate = async (req, res, next) => {
  try {
    const { tariffRateUniqueId } = req.params;
    const user = req.user;
    req.body.user = user;
    const result = await executeInTransaction(async () => {
      return await tariffRateService.updateTariffRate(tariffRateUniqueId, req.body);
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Delete a tariff rate by ID
exports.deleteTariffRate = async (req, res, next) => {
  try {
    const { tariffRateUniqueId } = req.params;
    const user = req.user;
    const result = await executeInTransaction(async () => {
      return await tariffRateService.deleteTariffRate(tariffRateUniqueId, user);
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
