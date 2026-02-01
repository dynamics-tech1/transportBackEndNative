const Services = require("../Services/Cancellation.service");
const ServerResponder = require("../Utils/ServerResponder");

const updateCancellationReasons = async (req, res, next) => {
  try {
    const result = await Services.updateCancellationReason(req, res);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
const deleteCancellationReasons = async (req, res, next) => {
  try {
    const result = await Services.deleteCancellationReason(req, res);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
const addCancellationReasons = async (req, res, next) => {
  try {
    const result = await Services.addCancellationReason(req.body, req.user);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
const getAllCancellationReasons = async (req, res, next) => {
  try {
    const result = await Services.getAllCancellationReasons(req.query);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
module.exports = {
  getAllCancellationReasons,
  addCancellationReasons,
  deleteCancellationReasons,
  updateCancellationReasons,
};
