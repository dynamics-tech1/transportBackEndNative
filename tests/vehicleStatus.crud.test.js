#!/usr/bin/env node
/**
 * VehicleStatus CRUD Test Suite
 * ==============================
 * Tests all CRUD operations for the VehicleStatus resource.
 *
 * Endpoints tested:
 *   POST   /api/admin/vehicleStatus       → Create a vehicle status entry
 *   GET    /api/admin/vehicleStatus        → List vehicle statuses (paginated)
 *   GET    /vehicleStatus/:id    → Get single by integer ID
 *   PUT    /vehicleStatus/:id    → Update by integer ID
 *   DELETE /vehicleStatus/:id    → Hard delete by integer ID
 *
 * Required fields for CREATE:
 *   - vehicleUniqueId (UUID of an existing vehicle)
 *   - statusTypeId (integer, FK to VehicleStatusTypes)
 *
 * Notes:
 *   - Uses integer auto-increment IDs for update/delete
 *   - Requires an existing Vehicle and VehicleStatusType in the DB
 *   - GET /vehicleStatus lists VehicleStatusTypes, not VehicleStatus rows
 *   - Hard deletes (not soft)
 *
 * Usage:
 *   node tests/vehicleStatus.crud.test.js
 */

"use strict";

const { setup, request, auth, test, assert, printResults } = require("./testHelper");

const state = {
  vehicleUniqueId: null,
  statusTypeId: null,
  vehicleStatusId: null,
};

(async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  VehicleStatus CRUD Tests                    ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await setup();

  // ── Prerequisites ───────────────────────────────────────────────────────
  console.log("━━ Prerequisites ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await test("Fetch existing vehicle", async () => {
    // Try to get a vehicle from ownership or vehicle list
    const res = await request("GET", "/api/admin/vehicleOwnerships?limit=1", null, auth());
    const data = res.body?.data || [];
    if (data.length > 0) {
      state.vehicleUniqueId = data[0]?.vehicle?.uniqueId || data[0]?.vehicleUniqueId;
    }
    // Fallback: try vehicle driver list
    if (!state.vehicleUniqueId) {
      const res2 = await request("GET", "/api/vehicleDriver?limit=1", null, auth());
      const data2 = res2.body?.data || [];
      if (data2.length > 0) {
        state.vehicleUniqueId = data2[0].vehicleUniqueId;
      }
    }
    assert(state.vehicleUniqueId, "No vehicles found in system — need at least one vehicle");
    return `Using vehicle: ${state.vehicleUniqueId}`;
  });

  await test("Fetch existing status type", async () => {
    const res = await request("GET", "/vehicleStatusTypes", null, auth());
    const data = res.body?.data || [];
    assert(data.length > 0, "No status types found — create one first");
    state.statusTypeId = data[0].VehicleStatusTypeId;
    return `Using statusTypeId: ${state.statusTypeId} (${data[0].VehicleStatusTypeName})`;
  });

  // ── CREATE ──────────────────────────────────────────────────────────────
  console.log("\n━━ CRUD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await test("Create vehicle status", async () => {
    const res = await request(
      "POST",
      "/vehicleStatus",
      {
        vehicleUniqueId: state.vehicleUniqueId,
        statusTypeId: state.statusTypeId,
        VehicleStatusTypeId: state.statusTypeId,
      },
      auth(),
    );
    assert(
      res.body?.message === "success",
      `Create failed: ${JSON.stringify(res.body)}`,
    );
    // Get the created ID from the response or via lookup
    const insertId = res.body?.data?.insertId;
    if (insertId) state.vehicleStatusId = insertId;
    return `Created (insertId: ${insertId || "N/A"})`;
  });

  // If we didn't get insertId, find it by querying
  if (!state.vehicleStatusId) {
    await test("Lookup created status ID", async () => {
      const res = await request(
        "GET",
        `/vehicleStatus`,
        null,
        auth(),
      );
      // The list endpoint returns VehicleStatusTypes, so we fetch by vehicle
      // Use a direct lookup approach
      const res2 = await request(
        "GET",
        `/vehicleStatus/${state.vehicleUniqueId}`,
        null,
        auth(),
      );
      // Try to extract ID
      if (res2.body?.data?.vehicleStatusId) {
        state.vehicleStatusId = res2.body.data.vehicleStatusId;
      }
      assert(state.vehicleStatusId, "Could not determine vehicleStatusId");
      return `Found ID: ${state.vehicleStatusId}`;
    });
  }

  // ── READ ────────────────────────────────────────────────────────────────
  await test("Get vehicle status by ID", async () => {
    assert(state.vehicleStatusId, "No ID from create step");
    const res = await request(
      "GET",
      `/vehicleStatus/${state.vehicleStatusId}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Get failed: ${JSON.stringify(res.body)}`);
    assert(res.body?.data, "No data returned");
    return `vehicleUniqueId: ${res.body.data.vehicleUniqueId}`;
  });

  await test("List vehicle statuses (paginated)", async () => {
    const res = await request("GET", "/vehicleStatus", null, auth());
    assert(res.body?.message === "success", `List failed: ${JSON.stringify(res.body)}`);
    return `Results: ${(res.body?.data || []).length} items`;
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────
  await test("Update vehicle status — requires valid ID", async () => {
    assert(state.vehicleStatusId, "No ID — cannot update");
    const res = await request(
      "PUT",
      `/vehicleStatus/${state.vehicleStatusId}`,
      { statusTypeId: state.statusTypeId, VehicleStatusTypeId: state.statusTypeId },
      auth(),
    );
    assert(res.body?.message === "success", `Update failed: ${JSON.stringify(res.body)}`);
    return "Updated remark";
  });

  await test("Update with invalid ID → should fail", async () => {
    const res = await request(
      "PUT",
      `/vehicleStatus/999999`,
      { remark: "ghost" },
      auth(),
    );
    assert(res.status >= 400, `Expected failure: ${JSON.stringify(res.body)}`);
    return "Correctly rejected non-existent ID";
  });

  // ── DELETE ──────────────────────────────────────────────────────────────
  await test("Delete vehicle status — requires valid ID", async () => {
    assert(state.vehicleStatusId, "No ID — cannot delete");
    const res = await request(
      "DELETE",
      `/vehicleStatus/${state.vehicleStatusId}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Delete failed: ${JSON.stringify(res.body)}`);
    return "Deleted";
  });

  await test("Verify deleted — get by ID should fail", async () => {
    const res = await request(
      "GET",
      `/vehicleStatus/${state.vehicleStatusId}`,
      null,
      auth(),
    );
    assert(res.status >= 400, `Still found: ${JSON.stringify(res.body)}`);
    return "Confirmed deleted";
  });

  await test("Delete with invalid ID → should fail", async () => {
    const res = await request(
      "DELETE",
      `/vehicleStatus/999999`,
      null,
      auth(),
    );
    assert(res.status >= 400, `Expected failure: ${JSON.stringify(res.body)}`);
    return "Correctly rejected non-existent ID";
  });

  printResults("VehicleStatus Results");
})();
