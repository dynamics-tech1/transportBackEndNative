const service = require("../Services/FinancialInstitutionAccount.service");
const ServerResponder = require("../Utils/ServerResponder");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");

exports.createFinancialInstitutionAccount = async (req, res, next) => {
  try {
    const data = req.body;
    const user = req?.user;

    const userUniqueId = user?.userUniqueId;
    data.addedBy = userUniqueId;
    data.user = user; // Pass the full user object for createdBy field
    const result = await executeInTransaction(async () => {
      return await service.createFinancialInstitutionAccount(data);
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.getFinancialInstitutionAccounts = async (req, res, next) => {
  try {
    const filters = req.query;
    const result = await service.getFinancialInstitutionAccounts(filters);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.updateFinancialInstitutionAccountByUniqueId = async (
  req,
  res,
  next,
) => {
  try {
    const { accountUniqueId } = req.params;
    const updates = req.body;
    const result = await executeInTransaction(async () => {
      return await service.updateFinancialInstitutionAccountByUniqueId(
        accountUniqueId,
        updates,
      );
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

exports.deleteFinancialInstitutionAccountByUniqueId = async (
  req,
  res,
  next,
) => {
  try {
    const { accountUniqueId } = req.params;
    const result = await executeInTransaction(async () => {
      return await service.deleteFinancialInstitutionAccountByUniqueId(
        accountUniqueId,
      );
    });
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
