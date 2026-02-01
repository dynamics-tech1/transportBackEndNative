const express = require("express");
const router = express.Router();
const delinquencyTypesController = require("../Controllers/DelinquencyTypes.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const { registerRoutes } = require("../Utils/RouteUtils");

const { validator } = require("../Middleware/Validator");
const {
  createDelinquencyType,
  updateDelinquencyType,
  delinquencyTypeParams,
  roleParams,
  getDelinquencyTypesQuery,
} = require("../Validations/DelinquencyTypes.schema");

const routes = [
  {
    path: "/api/admin/delinquency-types",
    method: "post",
    middleware: [verifyTokenOfAxios, validator(createDelinquencyType)],
    handler: delinquencyTypesController.createDelinquencyType,
  },
  {
    path: "/api/admin/delinquency-types",
    method: "get",
    middleware: [
      verifyTokenOfAxios,
      validator(getDelinquencyTypesQuery, "query"),
    ],
    handler: delinquencyTypesController.getDelinquencyTypes,
  },
  {
    path: "/api/admin/delinquency-types/:delinquencyTypeUniqueId",
    method: "put",
    middleware: [
      verifyTokenOfAxios,
      validator(delinquencyTypeParams, "params"),
      validator(updateDelinquencyType),
    ],
    handler: delinquencyTypesController.updateDelinquencyType,
  },
  {
    path: "/api/admin/delinquency-types/:delinquencyTypeUniqueId",
    method: "delete",
    middleware: [
      verifyTokenOfAxios,
      validator(delinquencyTypeParams, "params"),
    ],
    handler: delinquencyTypesController.deleteDelinquencyType,
  },
  {
    path: "/api/admin/delinquency-types/role/:roleUniqueId",
    method: "get",
    middleware: [verifyTokenOfAxios, validator(roleParams, "params")],
    handler: delinquencyTypesController.getDelinquencyTypesByRole,
  },
  {
    path: "/api/admin/delinquency-types/:delinquencyTypeUniqueId/toggle-active",
    method: "patch",
    middleware: [
      verifyTokenOfAxios,
      validator(delinquencyTypeParams, "params"),
    ],
    handler: delinquencyTypesController.toggleDelinquencyTypeActive,
  },
];

registerRoutes(router, routes);
module.exports = router;
