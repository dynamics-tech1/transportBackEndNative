const { pool } = require("../../Middleware/Database.config");
const logger = require("../../Utils/logger");
const fs = require("fs");
const path = require("path");

/**
 * Database Migration System
 *
 * PURPOSE: Manages database schema versioning and migrations. Provides a safe, trackable way
 * to apply database changes (schema modifications, indexes, data migrations) with version control.
 *
 * PROBLEM SOLVED: Previously, database schema changes were done manually or through one-off scripts.
 * There was no:
 * - Version control for database changes
 * - Tracking of which changes were applied
 * - Rollback capability
 * - Consistent application across environments (dev, staging, production)
 *
 * This system ensures all database changes are tracked, versioned, and applied consistently.
 */

const MIGRATIONS_TABLE = "schema_migrations";
const MIGRATIONS_DIR = path.join(__dirname);

/**
 * Initialize the migrations table if it doesn't exist
 *
 * PURPOSE: Creates the schema_migrations table that tracks which migrations have been executed.
 * This table stores migration history including version, name, execution time, and status.
 *
 * WHEN TO USE: Automatically called by runMigrations(). No need to call manually.
 *
 * @returns {Promise<void>} Resolves when table is created or already exists
 */
const initializeMigrationsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INT,
        status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
        error_message TEXT,
        INDEX idx_version (version),
        INDEX idx_executed_at (executed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    logger.info("Migrations table initialized");
  } catch (error) {
    logger.error("Failed to initialize migrations table", {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get all executed migrations
 *
 * PURPOSE: Retrieves the list of all successfully executed migrations from the database.
 * Used to determine which migrations have already been applied.
 *
 * WHEN TO USE: Called internally by runMigrations() to filter out already-executed migrations.
 * Can also be used to query migration history.
 *
 * @returns {Promise<Array>} Array of migration objects with version, name, executed_at, status
 */
const getExecutedMigrations = async () => {
  try {
    const [migrations] = await pool.query(
      `SELECT version, name, executed_at, status FROM ${MIGRATIONS_TABLE} WHERE status = 'success' ORDER BY version ASC`,
    );
    return migrations;
  } catch (error) {
    logger.error("Failed to get executed migrations", {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Record a migration as executed
 *
 * PURPOSE: Records a migration's execution in the schema_migrations table for tracking.
 * Stores execution time, status (success/failed), and error message if failed.
 *
 * WHEN TO USE: Called internally by executeMigration() after running a migration.
 * No need to call manually.
 *
 * @param {string} version - Migration version number (e.g., "001")
 * @param {string} name - Migration name/description (e.g., "initial-indexes")
 * @param {number} executionTime - Execution time in milliseconds
 * @param {string} [status="success"] - Migration status: "success", "failed", or "pending"
 * @param {string|null} [errorMessage=null] - Error message if migration failed
 * @returns {Promise<void>} Resolves when migration is recorded
 */
const recordMigration = async (
  version,
  name,
  executionTime,
  status = "success",
  errorMessage = null,
) => {
  try {
    await pool.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (version, name, execution_time_ms, status, error_message)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         execution_time_ms = VALUES(execution_time_ms),
         status = VALUES(status),
         error_message = VALUES(error_message),
         executed_at = CURRENT_TIMESTAMP`,
      [version, name, executionTime, status, errorMessage],
    );
  } catch (error) {
    logger.error("Failed to record migration", {
      version,
      name,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get migration files from the migrations directory
 *
 * PURPOSE: Scans the migrations directory for SQL migration files and parses their version numbers.
 * Migration files must follow naming pattern: NNN-description.sql (e.g., 001-initial-indexes.sql)
 *
 * WHEN TO USE: Called internally by runMigrations() to discover available migrations.
 *
 * @returns {Array<Object>} Array of migration file objects with:
 *   - version: Version number (e.g., "001")
 *   - name: Migration name (e.g., "initial-indexes")
 *   - filename: Full filename (e.g., "001-initial-indexes.sql")
 *   - path: Full file path
 * @throws {Error} If migration file name doesn't match expected format
 */
const getMigrationFiles = () => {
  try {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Sort to ensure execution order

    return files.map((file) => {
      const match = file.match(/^(\d+)-(.+)\.sql$/);
      if (!match) {
        throw new Error(
          `Invalid migration file name: ${file}. Expected format: NNN-description.sql`,
        );
      }
      return {
        version: match[1],
        name: match[2],
        filename: file,
        path: path.join(MIGRATIONS_DIR, file),
      };
    });
  } catch (error) {
    logger.error("Failed to get migration files", {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Execute a single migration file
 *
 * PURPOSE: Executes a single migration file within a transaction. If any statement fails,
 * the entire migration is rolled back. Records execution time and status.
 *
 * PROBLEM SOLVED: Ensures migrations are atomic - either all statements succeed or all are rolled back.
 * Prevents partial migrations that could leave the database in an inconsistent state.
 *
 * WHEN TO USE: Called internally by runMigrations() for each pending migration.
 *
 * @param {Object} migration - Migration object with version, name, and path
 * @param {string} migration.version - Migration version number
 * @param {string} migration.name - Migration name
 * @param {string} migration.path - Full path to migration SQL file
 * @returns {Promise<Object>} Result object with success, version, name, executionTime
 * @throws {Error} If migration execution fails
 *
 * @example
 * const migration = { version: "001", name: "initial-indexes", path: "/path/to/001-initial-indexes.sql" };
 * const result = await executeMigration(migration);
 * // Migration executed in transaction, result recorded in schema_migrations table
 */
const executeMigration = async (migration) => {
  const startTime = currentDate();
  const { version, name, path: filePath } = migration;

  try {
    logger.info(`Executing migration: ${version}-${name}`);

    // Read migration file
    const sql = fs.readFileSync(filePath, "utf8");

    // Remove comments and split by semicolon
    const cleanedSql = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--") && line.trim().length > 0)
      .join("\n");

    // Split by semicolon and filter out empty statements
    const statements = cleanedSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    // Execute each statement in a transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const statement of statements) {
        if (statement.trim()) {
          await connection.query(statement);
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const executionTime = currentDate() - startTime;
    await recordMigration(version, name, executionTime, "success");

    logger.info(`Migration ${version}-${name} executed successfully`, {
      executionTime: `${executionTime}ms`,
    });

    return {
      success: true,
      version,
      name,
      executionTime,
    };
  } catch (error) {
    const executionTime = currentDate() - startTime;
    await recordMigration(
      version,
      name,
      executionTime,
      "failed",
      error.message,
    );

    logger.error(`Migration ${version}-${name} failed`, {
      error: error.message,
      executionTime: `${executionTime}ms`,
    });

    throw error;
  }
};

/**
 * Run all pending migrations
 *
 * PURPOSE: Executes all pending (not yet executed) migrations in version order.
 * This is the main function to call when you want to apply database changes.
 *
 * WHAT IT DOES:
 * 1. Initializes the migrations table if it doesn't exist
 * 2. Discovers all migration files in the migrations directory
 * 3. Filters out already-executed migrations
 * 4. Executes pending migrations in order (001, 002, 003...)
 * 5. Records each migration's execution in the database
 *
 * WHEN TO USE:
 * - Initial database setup (run once after creating tables)
 * - After deploying new migrations (run on deployment)
 * - Database schema updates (apply new changes)
 * - Via API endpoint: POST /api/admin/migrations/run
 *
 * @returns {Promise<Object>} Result object with:
 *   - success: boolean (true if all migrations succeeded)
 *   - message: Status message
 *   - executed: Number of migrations executed
 *   - results: Array of execution results for each migration
 *   - errors: Array of errors (if any)
 *
 * @example
 * const result = await runMigrations();
 * console.log(`Executed ${result.executed} migrations`);
 * if (result.errors.length > 0) {
 *   console.error('Migration errors:', result.errors);
 * }
 */
const runMigrations = async () => {
  try {
    // Initialize migrations table
    await initializeMigrationsTable();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    const executedVersions = new Set(executedMigrations.map((m) => m.version));

    // Get all migration files
    const migrationFiles = getMigrationFiles();

    // Filter out already executed migrations
    const pendingMigrations = migrationFiles.filter(
      (migration) => !executedVersions.has(migration.version),
    );

    if (pendingMigrations.length === 0) {
      logger.info("No pending migrations");
      return {
        success: true,
        message: "No pending migrations",
        executed: 0,
      };
    }

    logger.info(`Found ${pendingMigrations.length} pending migration(s)`);

    const results = [];
    for (const migration of pendingMigrations) {
      try {
        const result = await executeMigration(migration);
        results.push(result);
      } catch (error) {
        logger.error("Migration execution stopped due to error", {
          migration: `${migration.version}-${migration.name}`,
          error: error.message,
        });
        throw error;
      }
    }

    logger.info(`Successfully executed ${results.length} migration(s)`);

    return {
      success: true,
      message: `Executed ${results.length} migration(s)`,
      executed: results.length,
      results,
    };
  } catch (error) {
    logger.error("Migration process failed", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get migration status
 *
 * PURPOSE: Returns the current status of all migrations - which have been executed,
 * which are pending, and overall statistics.
 *
 * WHEN TO USE:
 * - Check migration status before/after running migrations
 * - Verify which migrations have been applied
 * - Debugging migration issues
 * - Via API endpoint: GET /api/admin/migrations/status
 *
 * @returns {Promise<Object>} Status object with:
 *   - total: Total number of migration files found
 *   - executed: Number of successfully executed migrations
 *   - pending: Number of pending migrations
 *   - migrations: Array of migration objects with:
 *     - version: Migration version
 *     - name: Migration name
 *     - status: "executed" or "pending"
 *     - executedAt: Timestamp when executed (null if pending)
 *
 * @example
 * const status = await getMigrationStatus();
 * console.log(`Total: ${status.total}, Executed: ${status.executed}, Pending: ${status.pending}`);
 * status.migrations.forEach(m => {
 *   console.log(`${m.version}-${m.name}: ${m.status}`);
 * });
 */
const getMigrationStatus = async () => {
  try {
    await initializeMigrationsTable();
    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = getMigrationFiles();

    const status = {
      total: migrationFiles.length,
      executed: executedMigrations.length,
      pending: 0,
      migrations: [],
    };

    const executedVersions = new Set(executedMigrations.map((m) => m.version));

    migrationFiles.forEach((migration) => {
      const isExecuted = executedVersions.has(migration.version);
      if (!isExecuted) {
        status.pending++;
      }

      const executedMigration = executedMigrations.find(
        (m) => m.version === migration.version,
      );

      status.migrations.push({
        version: migration.version,
        name: migration.name,
        status: isExecuted ? "executed" : "pending",
        executedAt: executedMigration?.executed_at || null,
      });
    });

    return status;
  } catch (error) {
    logger.error("Failed to get migration status", {
      error: error.message,
    });
    throw error;
  }
};

module.exports = {
  runMigrations,
  getMigrationStatus,
  executeMigration,
  initializeMigrationsTable,
};
