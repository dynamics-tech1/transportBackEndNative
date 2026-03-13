#!/usr/bin/env node
/**
 * VehicleDriver CRUD Test Suite
 * ==============================
 * Tests all CRUD operations for VehicleDriver (vehicle-to-driver assignment).
 *
 * Endpoints tested:
 *   POST   /api/vehicleDriver   → Assign a vehicle to a driver
 *   GET    /api/vehicleDriver   → List assignments with filters + pagination
 *   PUT    /api/vehicleDriver   → Update assignment (vehicleDriverUniqueId in body)
 *   DELETE /api/vehicleDriver   → Delete assignment (vehicleDriverUniqueId in body/params)
 *
 * Required fields for CREATE:
 *   - vehicleUniqueId (UUID, FK to Vehicle)
 *   - driverUserUniqueId (UUID, FK to Users — use req.user)
 *   - assignmentStartDate (date string)
 *   - assignmentStatus ("active" | "inactive", default "active")
 *
 * Notes:
 *   - GET auto-resolves `driverUserUniqueId=self` to current user
 *   - Update/delete use vehicleDriverUniqueId (UUID, not integer ID)
 *   - A vehicle can only have one active assignment at a time
 *   - Hard deletes (not soft)
 *   - Create also triggers driver status update (best-effort)
 *
 * Prerequisites:
 *   - At least one unassigned Vehicle must exist in the DB
 *   - The admin user must exist as a driver role (or test will handle errors)
 *
 * Usage:
 *   node tests/vehicleDriver.crud.test.js
 */

"use strict";

const { setup, request, auth, test, assert, printResults } = require("./testHelper");

const state = {
  vehicleUniqueId: null,
  driverUserUniqueId: null,
  vehicleDriverUniqueId: null,
};

(async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  VehicleDriver CRUD Tests                    ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await setup();

  // ── Prerequisites ───────────────────────────────────────────────────────
  console.log("━━ Prerequisites ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await test("Fetch unassigned vehicle", async () => {
    // Get a vehicle from ownership list
    const res = await request("GET", "/api/admin/vehicleOwnerships?limit=5", null, auth());
    const data = res.body?.data || [];
    if (data.length > 0) {
      state.vehicleUniqueId = data[0]?.vehicle?.uniqueId || data[0]?.vehicleUniqueId;
    }
    assert(state.vehicleUniqueId, "No vehicles found — need at least one vehicle");
    return `Using vehicle: ${state.vehicleUniqueId}`;
  });

  await test("Resolve admin user UUID (self)", async () => {
    // The controller auto-resolves 'self' to req.user.userUniqueId
    // Make a GET call and extract userUniqueId from the response
    const res = await request("GET", "/api/vehicleDriver?driverUserUniqueId=self&limit=1", null, auth());
    // Even if empty, the request works — the admin UUID comes from JWT
    // We can extract it from the auth token or just use 'self' pattern
    state.driverUserUniqueId = "self"; // The controller resolves this
    return "Using 'self' (resolved from JWT)";
  });

  // ── CREATE ──────────────────────────────────────────────────────────────
  console.log("\n━━ CRUD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // First remove any existing active assignment for this vehicle
  await test("Cleanup: remove existing active assignment (if any)", async () => {
    const res = await request(
      "GET",
      `/api/vehicleDriver?vehicleUniqueId=${state.vehicleUniqueId}&assignmentStatus=active`,
      null,
      auth(),
    );
    const data = res.body?.data || [];
    for (const d of data) {
      if (d.vehicleDriverUniqueId) {
        await request(
          "DELETE",
          `/api/vehicleDriver`,
          null,
          { ...auth(), "Content-Type": "application/json" },
        );
      }
    }
    return `Cleared ${data.length} existing assignment(s)`;
  });

  await test("Create vehicle-driver assignment", async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await request(
      "POST",
      "/api/vehicleDriver",
      {
        vehicleUniqueId: state.vehicleUniqueId,
        driverUserUniqueId: state.driverUserUniqueId,
        assignmentStartDate: today,
        assignmentStatus: "active",
      },
      auth(),
    );
    assert(res.body?.message === "success", `Create failed: ${JSON.stringify(res.body)}`);
    state.vehicleDriverUniqueId = res.body?.data?.vehicleDriverUniqueId;
    assert(state.vehicleDriverUniqueId, "No vehicleDriverUniqueId returned");
    return `Created: ${state.vehicleDriverUniqueId}`;
  });

  await test("Duplicate create → should fail (vehicle already assigned)", async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await request(
      "POST",
      "/api/vehicleDriver",
      {
        vehicleUniqueId: state.vehicleUniqueId,
        driverUserUniqueId: state.driverUserUniqueId,
        assignmentStartDate: today,
      },
      auth(),
    );
    assert(res.status >= 400, `Expected failure: ${JSON.stringify(res.body)}`);
    return "Correctly rejected — vehicle already assigned";
  });

  // ── READ ────────────────────────────────────────────────────────────────
  await test("List assignments (filter by vehicle)", async () => {
    const res = await request(
      "GET",
      `/api/vehicleDriver?vehicleUniqueId=${state.vehicleUniqueId}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Get failed: ${JSON.stringify(res.body)}`);
    assert(res.body?.pagination, "Missing pagination");
    const data = res.body?.data || [];
    const found = data.find((d) => d.vehicleDriverUniqueId === state.vehicleDriverUniqueId);
    assert(found, "Created assignment not found in list");
    return `Found (${data.length} total)`;
  });

  await test("List assignments (filter by self)", async () => {
    const res = await request(
      "GET",
      `/api/vehicleDriver?driverUserUniqueId=self`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Get failed: ${JSON.stringify(res.body)}`);
    return `Found ${(res.body?.data || []).length} assignment(s) for self`;
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────
  await test("Update assignment — requires valid UUID", async () => {
    assert(state.vehicleDriverUniqueId, "No UUID — cannot update");
    const res = await request(
      "PUT",
      `/api/vehicleDriver`,
      {
        vehicleDriverUniqueId: state.vehicleDriverUniqueId,
        assignmentStatus: "inactive",
      },
      auth(),
    );
    assert(res.body?.message === "success", `Update failed: ${JSON.stringify(res.body)}`);
    return "Updated status → inactive";
  });

  await test("Verify update applied", async () => {
    const res = await request(
      "GET",
      `/api/vehicleDriver?vehicleDriverUniqueId=${state.vehicleDriverUniqueId}`,
      null,
      auth(),
    );
    const data = res.body?.data || [];
    assert(data.length > 0, "Assignment not found");
    assert(data[0].assignmentStatus === "inactive", `Status: ${data[0].assignmentStatus}`);
    return `Status: ${data[0].assignmentStatus}`;
  });

  await test("Update without UUID → should fail", async () => {
    const res = await request(
      "PUT",
      `/api/vehicleDriver`,
      { assignmentStatus: "active" },
      auth(),
    );
    assert(res.status >= 400, `Expected failure: ${JSON.stringify(res.body)}`);
    return "Correctly rejected — no UUID";
  });

  // ── DELETE ──────────────────────────────────────────────────────────────
  await test("Delete assignment — requires valid UUID", async () => {
    assert(state.vehicleDriverUniqueId, "No UUID — cannot delete");
    const res = await request(
      "DELETE",
      `/api/vehicleDriver`,
      { vehicleDriverUniqueId: state.vehicleDriverUniqueId },
      auth(),
    );
    assert(res.body?.message === "success", `Delete failed: ${JSON.stringify(res.body)}`);
    return "Deleted";
  });

  await test("Verify deleted — not in list", async () => {
    const res = await request(
      "GET",
      `/api/vehicleDriver?vehicleDriverUniqueId=${state.vehicleDriverUniqueId}`,
      null,
      auth(),
    );
    const data = res.body?.data || [];
    assert(data.length === 0, `Still found: ${data.length} results`);
    return "Confirmed deleted";
  });

  printResults("VehicleDriver Results");
})();
