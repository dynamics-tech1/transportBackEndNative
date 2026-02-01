const {
  createVehicleOwnership,
  updateVehicleOwnership,
  deleteVehicleOwnership,
  getVehicleOwnershipsByFilter,
} = require("../Services/VehicleOwnership.service");
const ServerResponder = require("../Utils/ServerResponder");

const createVehicleOwnershipController = async (req, res, next) => {
  try {
    const response = await createVehicleOwnership(req.body);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const updateVehicleOwnershipController = async (req, res, next) => {
  try {
    const response = await updateVehicleOwnership(req.query);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const deleteVehicleOwnershipController = async (req, res, next) => {
  try {
    const response = await deleteVehicleOwnership(req.params.ownershipId);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const listVehicleOwnershipsController = async (req, res, next) => {
  try {
    const { page, limit, includePagination } = req.query || {};
    // Extract filters by removing pagination params
    const { ...filters } = req.query || {};
    delete filters.page;
    delete filters.limit;
    delete filters.includePagination;

    const hasFilters = Object.keys(filters).length > 0;

    const response = await getVehicleOwnershipsByFilter({
      filters: hasFilters ? filters : {},
      page,
      limit,
      includePagination:
        includePagination === "true" || includePagination === true,
    });
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVehicleOwnershipController,
  updateVehicleOwnershipController,
  deleteVehicleOwnershipController,
  listVehicleOwnershipsController,
};
