#!/usr/bin/env node
/**
 * VehicleStatusType CRUD Test Suite
 * ==================================
 * Tests all CRUD operations for the VehicleStatusType resource.
 *
 * Endpoints tested:
 *   POST   /vehicleStatusType                      → Create a new status type
 *   GET    /vehicleStatusTypes                     → List all status types (filterable)
 *   PUT    /vehicleStatusType/:uuid               → Update a status type by UUID
 *   DELETE /vehicleStatusType/:uuid               → Soft delete a status type by UUID
 */

"use strict";

const { setup, request, auth, test, assert, printResults } = require("./testHelper");

const runId = Date.now().toString().slice(-6);
const TYPE_NAME = `TestStatusType_${runId}`;
const TYPE_NAME_UPDATED = `TestStatusType_${runId}_v2`;
const TYPE_DESC = "E2E UUID test status type description";

const state = { vehicleStatusTypeUniqueId: null };

(async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  VehicleStatusType CRUD Tests (UUID Edition) ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await setup();

  // ── CREATE ──────────────────────────────────────────────────────────────
  await test("Create status type (generates UUID)", async () => {
    const res = await request(
      "POST",
      "/vehicleStatusType",
      { typeName: TYPE_NAME, description: TYPE_DESC },
      auth(),
    );
    assert(res.body?.message === "success", `Create failed: ${JSON.stringify(res.body)}`);
    return `Created: ${TYPE_NAME}`;
  });

  // ── READ (list/filter) ──────────────────────────────────────────────────
  await test("List status types — find created UUID", async () => {
    // Wait a brief moment or just query by name
    const res = await request("GET", `/vehicleStatusTypes?typeName=${TYPE_NAME}`, null, auth());
    assert(res.body?.message === "success", "List failed");
    const data = res.body?.data || [];
    const found = data.find((d) => d.VehicleStatusTypeName === TYPE_NAME);
    assert(found, `Not found in list: ${TYPE_NAME}`);
    state.vehicleStatusTypeUniqueId = found.vehicleStatusTypeUniqueId;
    assert(state.vehicleStatusTypeUniqueId, "Record missing vehicleStatusTypeUniqueId");
    return `Found UUID: ${state.vehicleStatusTypeUniqueId}`;
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────
  await test("Update status type by UUID (path param)", async () => {
    assert(state.vehicleStatusTypeUniqueId, "No UUID available");
    const res = await request(
      "PUT",
      `/vehicleStatusType/${state.vehicleStatusTypeUniqueId}`,
      { typeName: TYPE_NAME_UPDATED, description: "updated desc" },
      auth(),
    );
    assert(res.body?.message === "success", `Update failed: ${JSON.stringify(res.body)}`);
    return "Updated name via path param";
  });

  // ── DELETE (Soft) ───────────────────────────────────────────────────────
  await test("Soft-delete status type by UUID", async () => {
    assert(state.vehicleStatusTypeUniqueId, "No UUID available");
    const res = await request(
      "DELETE",
      `/vehicleStatusType/${state.vehicleStatusTypeUniqueId}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Delete failed: ${JSON.stringify(res.body)}`);
    return "Soft-deleted";
  });

  await test("Verify soft-deleted record is hidden in list", async () => {
    const res = await request(
      "GET",
      `/vehicleStatusTypes?vehicleStatusTypeUniqueId=${state.vehicleStatusTypeUniqueId}`,
      null,
      auth(),
    );
    const data = res.body?.data || [];
    assert(data.length === 0, "Record still visible after soft-delete");
    return "Confirmed hidden";
  });

  printResults("VehicleStatusType Results");
})();
