const {
  createStatus,
  updateStatus,
  deleteStatus,
  getAllStatuses,
} = require("../Services/Status.service");
const ServerResponder = require("../Utils/ServerResponder");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");

const createStatusController = async (req, res, next) => {
  try {
    const { statusName } = req.body;
    const statusDescription =
      req.body.statusDescription !== undefined
        ? req.body.statusDescription
        : req.body.description;
    const createdStatus = await executeInTransaction(async () => {
      return await createStatus({
        statusName,
        statusDescription,
        user: req?.user,
      });
    });
    ServerResponder(res, createdStatus);
  } catch (error) {
    next(error);
  }
};

const updateStatusController = async (req, res, next) => {
  try {
    const updateBody = {
      ...req.body,
      user: req.user,
    };
    const response = await executeInTransaction(async () => {
      return await updateStatus(req.params.statusUniqueId, updateBody);
    });
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const deleteStatusController = async (req, res, next) => {
  try {
    const user = req.user;
    const response = await executeInTransaction(async () => {
      return await deleteStatus(req.params.statusUniqueId, user);
    });
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const getAllStatusesController = async (req, res, next) => {
  try {
    const response = await getAllStatuses(req.query);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStatusController,
  updateStatusController,
  deleteStatusController,
  getAllStatusesController,
};
