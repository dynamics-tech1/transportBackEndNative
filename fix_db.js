const dotenv = require("dotenv");
dotenv.config();
const { pool } = require("./Middleware/Database.config");

async function runSQL(sql, label) {
  try {
    await pool.query(sql);
    console.log(`✅ SUCCESS: ${label}`);
  } catch (e) {
    if (e.code === 'ER_DUP_COLUMN_NAME' || e.code === 'ER_DUP_KEYNAME') {
      console.log(`ℹ️ SKIP: ${label} (already exists)`);
    } else {
      console.error(`❌ ERROR: ${label} -> ${e.message}`);
    }
  }
}

async function run() {
  console.log("Starting DB Fix...");

  const tables = [
    { name: "VehicleStatusTypes", uniqueId: "vehicleStatusTypeUniqueId", deletedAt: "VehicleStatusTypeDeletedAt" },
    { name: "VehicleStatus", uniqueId: "vehicleStatusUniqueId", deletedAt: "vehicleStatusDeletedAt" },
    { name: "VehicleOwnership", uniqueId: "ownershipUniqueId", deletedAt: "vehicleOwnershipDeletedAt" }
  ];

  for (const t of tables) {
    console.log(`\nTable: ${t.name}`);
    await runSQL(`ALTER TABLE ${t.name} ADD COLUMN isDeleted TINYINT(1) DEFAULT 0`, `Add isDeleted to ${t.name}`);
    await runSQL(`ALTER TABLE ${t.name} ADD COLUMN ${t.deletedAt} DATETIME DEFAULT NULL`, `Add ${t.deletedAt} to ${t.name}`);
    await runSQL(`ALTER TABLE ${t.name} ADD COLUMN ${t.uniqueId} VARCHAR(36) DEFAULT NULL`, `Add ${t.uniqueId} to ${t.name}`);
    await runSQL(`CREATE UNIQUE INDEX idx_${t.uniqueId} ON ${t.name} (${t.uniqueId})`, `Add index for ${t.uniqueId}`);
  }

  console.log("\nDB Fix Complete.");
  process.exit(0);
}

run();
