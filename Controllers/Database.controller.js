const DatabaseService = require("../Services/Database.service");
const ServerResponder = require("../Utils/ServerResponder");
const AppError = require("../Utils/AppError");

const createTableController = async (req, res, next) => {
  try {
    const response = await DatabaseService.createTable();
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const getAllTablesController = async (req, res, next) => {
  try {
    const response = await DatabaseService.getAllTables();
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const dropTableController = async (req, res, next) => {
  try {
    const { tables } = req.body;

    if (!Array.isArray(tables) || tables.length === 0) {
      return next(new AppError("No tables provided in request body", 400));
    }

    const results = [];

    for (const tableName of tables) {
      try {
        const result = await DatabaseService.dropTable(tableName);
        results.push({ tableName, ...result });
      } catch (error) {
        results.push({
          tableName,
          status: "error",
          error: error.message || `Failed to drop table ${tableName}`,
        });
      }
    }

    ServerResponder(res, {
      message: "completed",
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

const dropAllTablesController = async (req, res, next) => {
  try {
    const response = await DatabaseService.dropAllTables();
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const updateTableController = async (req, res, next) => {
  try {
    const response = await DatabaseService.updateTable(
      req.params.tableName,
      req.body,
    );
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const changeColumnPropertyController = async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const response = await DatabaseService.changeColumnProperty(
      tableName,
      req.body,
    );
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const dropColumnController = async (req, res, next) => {
  try {
    const { tableName, columnName } = req.params;
    const response = await DatabaseService.dropColumn(tableName, columnName);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const getTableColumnsController = async (req, res, next) => {
  try {
    const response = await DatabaseService.getTableColumns(
      req.params.tableName,
    );
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const installPreDefinedDataController = async (req, res, next) => {
  try {
    const response = await DatabaseService.installPreDefinedData(req);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  installPreDefinedDataController,
  getTableColumnsController,
  createTableController,
  getAllTablesController,
  dropTableController,
  dropAllTablesController,
  updateTableController,
  changeColumnPropertyController,
  dropColumnController,
};
