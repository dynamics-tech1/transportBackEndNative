const ServerResponder = require("../Utils/ServerResponder");
const {
  getAlluserBalances,
  getuserBalanceById,
  getDriverLastBalanceByUserUniqueId,
  getuserBalanceByDateRange,
  getUserBalanceByFilterServices,
} = require("../Services/UserBalance.service/UserBalance.get.service.js");
const {
  updateUserBalance,
} = require("../Services/UserBalance.service/UserBalance.update.service.js");
const {
  deleteUserBalance,
} = require("../Services/UserBalance.service/UserBalance.delete.service.js");
const prepareAndCreateNewBalance = require("../Services/UserBalance.service/UserBalance.post.service.js");

// Create a new driver balance record
exports.createUserBalance = async (req, res, next) => {
  try {
    const user = req?.user;
    const result = await prepareAndCreateNewBalance.createUserBalance({
      ...req.body,
      ...user,
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get all driver balance records
exports.getAlluserBalances = async (req, res, next) => {
  try {
    const result = await getAlluserBalances();
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Get a driver balance record by ID
exports.getuserBalanceById = async (req, res, next) => {
  try {
    const result = await getuserBalanceById(req.params.userBalanceUniqueId);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Update a driver balance record by ID
exports.updateUserBalance = async (req, res, next) => {
  try {
    const result = await updateUserBalance(
      req.params.userBalanceUniqueId,
      req.body,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Delete a driver balance record by ID
exports.deleteUserBalance = async (req, res, next) => {
  try {
    const result = await deleteUserBalance(req.params.userBalanceUniqueId);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getDriverLastBalanceByUserUniqueId = async (req, res, next) => {
  try {
    const params = req?.params;
    let userUniqueId = params?.driverUniqueId;
    const fromDate = params?.fromDate,
      toDate = params?.toDate,
      offset = params?.length;

    const user = req.user;

    if (userUniqueId === "self") {
      userUniqueId = user?.userUniqueId;
    }
    let result = "";
    if (!fromDate && !toDate) {
      result = await getDriverLastBalanceByUserUniqueId(userUniqueId);
    } else if (fromDate && toDate) {
      result = await getuserBalanceByDateRange({
        fromDate,
        toDate,
        userUniqueId,
        offset,
      });
    }
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getDriverCurrentBalance = async (req, res, next) => {
  try {
    const { driverUniqueId } = req.params;
    const result = await getDriverLastBalanceByUserUniqueId(driverUniqueId);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getUserBalanceByFilter = async (req, res, next) => {
  try {
    const { query } = req;
    let userUniqueId = query?.userUniqueId;
    if (userUniqueId === "self") {
      userUniqueId = req.user?.userUniqueId;
      query.userUniqueId = userUniqueId;
    }
    const result = await getUserBalanceByFilterServices(query);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
