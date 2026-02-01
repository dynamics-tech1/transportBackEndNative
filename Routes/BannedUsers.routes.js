const express = require("express");
const router = express.Router();
const bannedUsersController = require("../Controllers/BannedUsers.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const { registerRoutes } = require("../Utils/RouteUtils");

const { validator } = require("../Middleware/Validator");
const {
  banUser,
  updateBan,
  banParams,
  getBannedUsersQuery,
} = require("../Validations/BannedUsers.schema");

const routes = [
  {
    path: "/api/admin/banned-users",
    method: "post",
    middleware: [verifyTokenOfAxios, validator(banUser)],
    handler: bannedUsersController.banUser,
  },
  {
    path: "/api/admin/banned-users",
    method: "get",
    middleware: [verifyTokenOfAxios, validator(getBannedUsersQuery, "query")],
    handler: bannedUsersController.getBannedUsers,
  },
  {
    path: "/api/admin/banned-users/:banUniqueId",
    method: "put",
    middleware: [
      verifyTokenOfAxios,
      validator(banParams, "params"),
      validator(updateBan),
    ],
    handler: bannedUsersController.updateBannedUser,
  },
  {
    path: "/api/admin/banned-users",
    method: "delete",
    middleware: [verifyTokenOfAxios], // Usually delete by ID, but route is path root? check controller later. Assuming body or query for now, leaving as is to avoid breaking without deeper check.
    handler: bannedUsersController.unbanUser,
  },
  {
    path: "/api/admin/banned-users/:banUniqueId/deactivate",
    method: "patch",
    middleware: [verifyTokenOfAxios, validator(banParams, "params")],
    handler: bannedUsersController.deactivateBan,
  },
];

registerRoutes(router, routes);
module.exports = router;
