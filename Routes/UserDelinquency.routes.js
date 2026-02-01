const express = require("express");
const router = express.Router();
const userDelinquencyController = require("../Controllers/UserDelinquency.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const { registerRoutes } = require("../Utils/RouteUtils");

const { validator } = require("../Middleware/Validator");
const {
  createUserDelinquency,
  userDelinquencyParams,
  userRoleParams,
} = require("../Validations/UserDelinquency.schema");

const routes = [
  {
    path: "/api/admin/user-delinquency",
    method: "post",
    middleware: [verifyTokenOfAxios, validator(createUserDelinquency)],
    handler: userDelinquencyController.createUserDelinquency,
  },
  {
    path: "/api/admin/getDelinquencyByFilter",
    method: "get",
    middleware: [verifyTokenOfAxios],
    handler: userDelinquencyController.getUserDelinquencies,
  },
  {
    path: "/api/admin/user-delinquency/:userDelinquencyUniqueId",
    method: "put",
    middleware: [
      verifyTokenOfAxios,
      validator(userDelinquencyParams, "params"),
    ],
    handler: userDelinquencyController.updateUserDelinquency,
  },
  {
    path: "/api/admin/user-delinquency/:userDelinquencyUniqueId",
    method: "delete",
    middleware: [
      verifyTokenOfAxios,
      validator(userDelinquencyParams, "params"),
    ],
    handler: userDelinquencyController.deleteUserDelinquency,
  },
  {
    path: "/api/admin/check-automatic-ban/:userRoleUniqueId",
    method: "get",
    middleware: [verifyTokenOfAxios, validator(userRoleParams, "params")],
    handler: userDelinquencyController.checkAutomaticBan,
  },
];

registerRoutes(router, routes);
module.exports = router;
