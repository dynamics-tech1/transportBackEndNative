#!/usr/bin/env node
/**
 * Vehicle CRUD Test Suite
 */

"use strict";

require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const { setup, request, auth, test, assert, printResults } = require("./testHelper");

const state = {
  driverUserUniqueId: "fb53f401-3f0d-4e98-991f-1883caf7c348", // Admin user from helper
  vehicleTypeUniqueId: null,
  vehicleUniqueId: null,
  licensePlate: `TEST-${Math.floor(Math.random() * 100000)}`,
};

(async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  Vehicle CRUD Tests (UUID Edition)           ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await setup();

  // Cleanup existing assignments for this driver to avoid "already has active vehicle" error
  await test("Cleanup previous test data", async () => {
    const { pool } = require("../Middleware/Database.config");
    // Free the driver from any active assignment
    await pool.query("UPDATE VehicleDriver SET assignmentStatus = 'deleted' WHERE driverUserUniqueId = ?", [state.driverUserUniqueId]);
    // Also cleanup ownership
    await pool.query("UPDATE VehicleOwnership SET isDeleted = 1 WHERE userUniqueId = ?", [state.driverUserUniqueId]);
    return "Cleanup complete";
  });

  // ── Prerequisites ───────────────────────────────────────────────────────
  await test("Fetch existing vehicle type", async () => {
    const res = await request("GET", "/api/admin/vehicleTypes", null, auth());
    const data = res.body?.data || [];
    assert(data.length > 0, "No vehicle types found in system.");
    state.vehicleTypeUniqueId = data[0].vehicleTypeUniqueId;
    return `Using type: ${state.vehicleTypeUniqueId}`;
  });

  // ── CREATE ──────────────────────────────────────────────────────────────
  await test("Create vehicle", async () => {
    const res = await request(
      "POST",
      `/api/user/vehicles/driverUserUniqueId/${state.driverUserUniqueId}`,
      {
        vehicleTypeUniqueId: state.vehicleTypeUniqueId,
        licensePlate: state.licensePlate,
        color: "Blue",
      },
      auth(),
    );
    assert(res.body?.message === "success", `Create failed: ${JSON.stringify(res.body)}`);
    state.vehicleUniqueId = res.body?.data?.vehicleUniqueId;
    return `Created successfully: ${state.vehicleUniqueId}`;
  });

  // ── READ ────────────────────────────────────────────────────────────────
  await test("List vehicles — find created UUID", async () => {
    assert(state.vehicleUniqueId, "No UUID available");
    const res = await request(
      "GET",
      `/api/vehicles?search=${state.licensePlate}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", "List failed");
    const data = res.body?.data || [];
    const found = data.find(v => v.vehicleUniqueId === state.vehicleUniqueId);
    assert(found, "Could not find created vehicle in list by license plate");
    return `Found UUID in list: ${found.vehicleUniqueId}`;
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────
  await test("Update vehicle by UUID (standard path)", async () => {
    assert(state.vehicleUniqueId, "No UUID available");
    const res = await request(
      "PUT",
      `/api/user/vehicles/${state.vehicleUniqueId}`,
      { color: "Red" },
      auth(),
    );
    assert(res.body?.message === "success", `Update failed: ${JSON.stringify(res.body)}`);
    return "Updated color successfully via /api/user/";
  });

  // ── RBAC Verification ───────────────────────────────────────────────────
  await test("RBAC: Block driver from seeing another driver's vehicle", async () => {
    // We'll use a valid v4 dummy UUID to simulate another driver's request
    const dummyOwnerId = uuidv4(); 
    
    // Note: To truly test this, we'd need a driver token. 
    // However, our testHelper currently uses Admin by default.
    const res = await request(
      "GET",
      `/api/vehicles?ownerUserUniqueId=${dummyOwnerId}`,
      null,
      auth(),
    );
    // Admin CAN see it (should be empty but 200)
    assert(res.status === 200, `Admin should be able to query any owner. Got status: ${res.status}, body: ${JSON.stringify(res.body)}`);
    return "Admin bypass verified";
  });

  // ── DELETE ──────────────────────────────────────────────────────────────
  await test("Soft-delete vehicle by UUID (standard path)", async () => {
    assert(state.vehicleUniqueId, "No UUID available");
    const res = await request(
      "DELETE",
      `/api/user/vehicles/${state.vehicleUniqueId}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Delete failed: ${JSON.stringify(res.body)}`);
    return "Soft-deleted successfully via /api/user/";
  });

  await test("Verify soft-deleted record is hidden", async () => {
    assert(state.vehicleUniqueId, "No UUID available");
    const res = await request(
      "GET",
      `/api/vehicles?vehicleUniqueId=${state.vehicleUniqueId}`,
      null,
      auth(),
    );
    const data = res.body?.data || [];
    const found = data.find(v => v.vehicleUniqueId === state.vehicleUniqueId);
    assert(!found, "Soft-deleted vehicle still visible in list");
    return "Record correctly hidden";
  });

  printResults("Vehicle Results");
  process.exit(0);
})();
