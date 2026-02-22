const {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicles,
} = require("../Services/Vehicle.service");
const ServerResponder = require("../Utils/ServerResponder");
const { usersRoles } = require("../Utils/ListOfSeedData");
const AppError = require("../Utils/AppError");

const createVehicleController = async (req, res, next) => {
  try {
    let driverUserUniqueId = req?.params?.driverUserUniqueId;
    const roleId = req?.user?.roleId;
    const user = req?.user;

    if (driverUserUniqueId === "self") {
      driverUserUniqueId = req?.user?.userUniqueId;
    }

    if (
      roleId === usersRoles.adminRoleId ||
      roleId === usersRoles.supperAdminRoleId
    ) {
      // Admin or super admin can create   Vehicle for any driver
    } else if (roleId === usersRoles.driverRoleId) {
      if (driverUserUniqueId !== req?.user?.userUniqueId) {
        return next(
          new AppError("You can't register vehicle for another driver", 403),
        );
      }
    }

    const response = await createVehicle(req.body, user, driverUserUniqueId);
    ServerResponder(res, response, 201);
  } catch (error) {
    next(error);
  }
};

const updateVehicleController = async (req, res, next) => {
  try {
    const { vehicleUniqueId } = req.params;
    const response = await updateVehicle(vehicleUniqueId, req.body, req.user);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const deleteVehicleController = async (req, res, next) => {
  try {
    const { vehicleUniqueId } = req.params;
    const response = await deleteVehicle(vehicleUniqueId, req.user);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const getVehiclesController = async (req, res, next) => {
  try {
    let ownerUserUniqueId = req?.params?.ownerUserUniqueId;
    const roleId = req?.user?.roleId;
    const user = req?.user;
    if (ownerUserUniqueId === "self" || ownerUserUniqueId == null) {
      ownerUserUniqueId = user?.userUniqueId;
    }
    if (
      roleId === usersRoles.adminRoleId ||
      roleId === usersRoles.supperAdminRoleId
    ) {
      // Admin or super admin can get vehicles for any user
    } else if (roleId === usersRoles.driverRoleId) {
      if (ownerUserUniqueId !== user?.userUniqueId) {
        return next(
          new AppError("You can't get vehicles for another driver", 403),
        );
      }
    }
    const response = await getVehicles({
      ...req.query,
      user: user,
      ownerUserUniqueId,
    });
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVehicleController,
  updateVehicleController,
  deleteVehicleController,
  getVehiclesController,
};
