const express = require("express");
const router = express.Router();
const {
  createTableController,
  getAllTablesController,
  dropTableController,
  dropAllTablesController,
  updateTableController,
  changeColumnPropertyController, // New
  dropColumnController,
  getTableColumnsController,
  installPreDefinedDataController, // New
} = require("../Controllers/Database.controller");
const { verifyTokenOfAxios } = require("../Middleware/VerifyToken");
const { validator } = require("../Middleware/Validator");
const {
  tableParams,
  installDataQuery,
} = require("../Validations/Database.schema");
const {
  runMigrations,
  getMigrationStatus,
} = require("../Database/Migrations/migration-runner");
const ServerResponder = require("../Utils/ServerResponder");
const AppError = require("../Utils/AppError");

// Route to create all tables (no body required - creates all tables from predefined SQL)
router.post("/api/admin/createTable", createTableController);

// Route to list all tables in the database
router.get("/api/admin/tables", getAllTablesController);

// Route to drop a table by name
router.delete("/api/admin/dropTables", dropTableController);

// Route to drop all tables
router.delete("/api/admin/dropAllTables", dropAllTablesController);

// Route to update a table by adding a column
router.put(
  "/api/admin/updateTable/:tableName",
  validator(tableParams, "params"),
  // validator(updateTable), // optional body validation
  updateTableController,
);

// New: Route to change a column's properties
router.put(
  "/api/admin/alterColumn/:tableName",
  validator(tableParams, "params"),
  changeColumnPropertyController,
);

// New: Route to drop a column
router.delete(
  "/api/admin/dropColumn/:tableName/:columnName",
  validator(tableParams, "params"),
  dropColumnController,
);
// New: Route to get table columns
router.get(
  "/tableColumns/:tableName",
  validator(tableParams, "params"),
  getTableColumnsController,
);
router.get(
  "/api/admin/installPreDefinedData",
  verifyTokenOfAxios,
  validator(installDataQuery, "query"),
  installPreDefinedDataController,
);

// POST method for installing predefined data
router.post(
  "/api/admin/installPreDefinedData",
  verifyTokenOfAxios,
  validator(installDataQuery, "query"),
  installPreDefinedDataController,
);

// Database migration endpoints
router.post(
  "/api/admin/migrations/run",
  verifyTokenOfAxios,
  async (req, res, next) => {
    try {
      const result = await runMigrations();
      ServerResponder(res, { message: "success", data: result });
    } catch {
      next(new AppError("Failed to run migrations", 500));
    }
  },
);

router.get(
  "/api/admin/migrations/status",
  verifyTokenOfAxios,
  async (req, res, next) => {
    try {
      const status = await getMigrationStatus();
      ServerResponder(res, { message: "success", data: status });
    } catch {
      next(new AppError("Failed to get migration status", 500));
    }
  },
);

module.exports = router;
