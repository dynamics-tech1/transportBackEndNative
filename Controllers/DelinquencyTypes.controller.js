const delinquencyTypesService = require("../Services/DelinquencyTypes.service");
const ServerResponder = require("../Utils/ServerResponder");

const handleServiceResponse = async (serviceCall, res, next) => {
  try {
    const result = await serviceCall;
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

const createDelinquencyType = async (req, res, next) => {
  const user = req.user;
  const data = {
    ...req.body,
    createdBy: user.userUniqueId,
    user,
  };

  await handleServiceResponse(
    delinquencyTypesService.createDelinquencyType(data),
    res,
    next,
  );
};

const getDelinquencyTypes = async (req, res, next) => {
  const filters = { ...req.query };

  if (filters.isActive !== undefined) {
    filters.isActive = filters.isActive === "true" || filters.isActive === true;
  }

  await handleServiceResponse(
    delinquencyTypesService.getDelinquencyTypes(filters),
    res,
    next,
  );
};

const updateDelinquencyType = async (req, res, next) => {
  const { delinquencyTypeUniqueId } = req.params;
  const data = { ...req.body, user: req.user };

  await handleServiceResponse(
    delinquencyTypesService.updateDelinquencyType(
      delinquencyTypeUniqueId,
      data,
    ),
    res,
    next,
  );
};

const deleteDelinquencyType = async (req, res, next) => {
  const { delinquencyTypeUniqueId } = req.params;

  await handleServiceResponse(
    delinquencyTypesService.deleteDelinquencyType(
      delinquencyTypeUniqueId,
      req.user,
    ),
    res,
    next,
  );
};

const getDelinquencyTypesByRole = async (req, res, next) => {
  const { roleUniqueId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  await handleServiceResponse(
    delinquencyTypesService.getDelinquencyTypesByRole(roleUniqueId, {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
    }),
    res,
    next,
  );
};

const toggleDelinquencyTypeActive = async (req, res, next) => {
  const { delinquencyTypeUniqueId } = req.params;

  await handleServiceResponse(
    delinquencyTypesService.toggleDelinquencyTypeActive(
      delinquencyTypeUniqueId,
    ),
    res,
    next,
  );
};

module.exports = {
  createDelinquencyType,
  getDelinquencyTypes,
  updateDelinquencyType,
  deleteDelinquencyType,
  getDelinquencyTypesByRole,
  toggleDelinquencyTypeActive,
};
