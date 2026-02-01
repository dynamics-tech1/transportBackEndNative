const ServerResponder = require("../Utils/ServerResponder");
const {
  createVehicleDriver,
  getVehicleDrivers,
  updateVehicleDriverByUniqueId,
  deleteVehicleDriverByUniqueId,
} = require("../Services/VehicleDriver.service");

// POST /api/vehicleDriver
const createVehicleDriverController = async (req, res, next) => {
  try {
    const body = req.body || {};
    const vehicleDriverCreatedBy = req.user?.userUniqueId;
    const result = await createVehicleDriver({
      ...body,
      vehicleDriverCreatedBy,
    });
    ServerResponder(res, result, 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/vehicleDriver
const getVehicleDriversController = async (req, res, next) => {
  try {
    const filters = req.query || {};
    const result = await getVehicleDrivers(filters);
    ServerResponder(res, result, 200);
  } catch (error) {
    next(error);
  }
};

// PUT /api/vehicleDriver/:vehicleDriverUniqueId
const updateVehicleDriverController = async (req, res, next) => {
  try {
    const { vehicleDriverUniqueId } = req.params;
    const body = req.body || {};
    const result = await updateVehicleDriverByUniqueId(
      vehicleDriverUniqueId,
      body,
    );
    ServerResponder(res, result, 200);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/vehicleDriver/:vehicleDriverUniqueId
const deleteVehicleDriverController = async (req, res, next) => {
  try {
    const { vehicleDriverUniqueId } = req.params;
    const result = await deleteVehicleDriverByUniqueId(vehicleDriverUniqueId);
    ServerResponder(res, result, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVehicleDriverController,
  getVehicleDriversController,
  updateVehicleDriverController,
  deleteVehicleDriverController,
};
