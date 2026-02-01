const tariffRateService = require("../Services/TariffRate.service");
const ServerResponder = require("../Utils/ServerResponder");

// Create a new tariff rate
exports.createTariffRate = async (req, res, next) => {
  try {
    const user = req.user;
    req.body.user = user;
    const result = await tariffRateService.createTariffRate(req.body);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get all tariff rates
exports.getAllTariffRates = async (req, res, next) => {
  try {
    const result = await tariffRateService.getAllTariffRates();
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get a tariff rate by ID
exports.getTariffRateById = async (req, res, next) => {
  try {
    const result = await tariffRateService.getTariffRateById(
      req.params.tariffRateUniqueId,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Update a tariff rate by ID
exports.updateTariffRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    req.body.user = user;
    const result = await tariffRateService.updateTariffRate(id, req.body);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Delete a tariff rate by ID
exports.deleteTariffRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const result = await tariffRateService.deleteTariffRate(id, user);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
