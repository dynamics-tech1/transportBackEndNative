#!/usr/bin/env node
/**
 * VehicleStatusType CRUD Test Suite
 * ==================================
 * Tests all CRUD operations for the VehicleStatusType resource.
 *
 * Endpoints tested:
 *   POST   /api/admin/vehicleStatusType       → Create a new status type
 *   GET    /api/admin/vehicleStatusTypes       → List all status types
 *   GET    /vehicleStatusType/:id    → Get a single status type by integer ID
 *   PUT    /vehicleStatusType/:id    → Update a status type by integer ID
 *   DELETE /vehicleStatusType/:id    → Delete a status type by integer ID
 *
 * Required fields for CREATE:
 *   - VehicleStatusTypeName (string, unique, max 50 chars)
 *   - statusTypeDescription (string, optional)
 *
 * Notes:
 *   - Uses integer auto‑increment IDs (not UUIDs)
 *   - Hard deletes (no soft delete)
 *   - Update/delete require the integer ID in the URL param
 *
 * Usage:
 *   node tests/vehicleStatusType.crud.test.js
 */

"use strict";

const { setup, request, auth, test, assert, printResults } = require("./testHelper");

const runId = Date.now().toString().slice(-6);
const TYPE_NAME = `TestStatusType_${runId}`;
const TYPE_NAME_UPDATED = `TestStatusType_${runId}_v2`;
const TYPE_DESC = "E2E test status type description";

const state = { id: null };

(async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  VehicleStatusType CRUD Tests                ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await setup();

  // ── CREATE ──────────────────────────────────────────────────────────────
  await test("Create status type", async () => {
    const res = await request(
      "POST",
      "/vehicleStatusType",
      { typeName: TYPE_NAME, VehicleStatusTypeName: TYPE_NAME, description: TYPE_DESC, statusTypeDescription: TYPE_DESC },
      auth(),
    );
    assert(res.body?.message === "success", `Create failed: ${JSON.stringify(res.body)}`);
    return `Created: ${TYPE_NAME}`;
  });

  await test("Duplicate create → should fail", async () => {
    const res = await request(
      "POST",
      "/vehicleStatusType",
      { typeName: TYPE_NAME, VehicleStatusTypeName: TYPE_NAME },
      auth(),
    );
    assert(res.status >= 400, `Expected failure but got: ${JSON.stringify(res.body)}`);
    return "Correctly rejected duplicate";
  });

  // ── READ (list) ─────────────────────────────────────────────────────────
  await test("List all status types — find created", async () => {
    const res = await request("GET", "/vehicleStatusTypes", null, auth());
    assert(res.body?.message === "success", `List failed: ${JSON.stringify(res.body)}`);
    const data = res.body?.data || [];
    const found = data.find((d) => d.VehicleStatusTypeName === TYPE_NAME);
    assert(found, `Not found in list: ${TYPE_NAME}`);
    state.id = found.VehicleStatusTypeId;
    return `Found ID: ${state.id}`;
  });

  // ── READ (by ID) ────────────────────────────────────────────────────────
  await test("Get status type by ID", async () => {
    assert(state.id, "No ID from previous step");
    const res = await request(
      "GET",
      `/vehicleStatusType/${state.id}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Get failed: ${JSON.stringify(res.body)}`);
    assert(
      res.body?.data?.VehicleStatusTypeName === TYPE_NAME,
      `Name mismatch: ${res.body?.data?.VehicleStatusTypeName}`,
    );
    return `Verified: ${res.body.data.VehicleStatusTypeName}`;
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────
  await test("Update status type — requires valid ID", async () => {
    assert(state.id, "No ID — cannot update");
    const res = await request(
      "PUT",
      `/vehicleStatusType/${state.id}`,
      { typeName: TYPE_NAME_UPDATED, statusTypeName: TYPE_NAME_UPDATED, description: "updated desc", statusTypeDescription: "updated desc" },
      auth(),
    );
    assert(res.body?.message === "success", `Update failed: ${JSON.stringify(res.body)}`);
    return "Updated name + description";
  });

  await test("Verify update applied", async () => {
    const res = await request(
      "GET",
      `/vehicleStatusType/${state.id}`,
      null,
      auth(),
    );
    assert(
      res.body?.data?.VehicleStatusTypeName === TYPE_NAME_UPDATED,
      `Name not updated: ${res.body?.data?.VehicleStatusTypeName}`,
    );
    return `Name: ${res.body.data.VehicleStatusTypeName}`;
  });

  await test("Update with invalid ID → should fail", async () => {
    const res = await request(
      "PUT",
      `/vehicleStatusType/999999`,
      { statusTypeName: "ghost" },
      auth(),
    );
    assert(res.status >= 400, `Expected failure: ${JSON.stringify(res.body)}`);
    return "Correctly rejected non-existent ID";
  });

  // ── DELETE ──────────────────────────────────────────────────────────────
  await test("Delete status type", async () => {
    assert(state.id, "No ID — cannot delete");
    const res = await request(
      "DELETE",
      `/vehicleStatusType/${state.id}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Delete failed: ${JSON.stringify(res.body)}`);
    return "Deleted";
  });

  await test("Verify deleted — get by ID should fail", async () => {
    const res = await request(
      "GET",
      `/vehicleStatusType/${state.id}`,
      null,
      auth(),
    );
    assert(res.status >= 400, `Still found after delete: ${JSON.stringify(res.body)}`);
    return "Confirmed deleted";
  });

  await test("Delete with invalid ID → should fail", async () => {
    const res = await request(
      "DELETE",
      `/vehicleStatusType/999999`,
      null,
      auth(),
    );
    assert(res.status >= 400, `Expected failure: ${JSON.stringify(res.body)}`);
    return "Correctly rejected non-existent ID";
  });

  printResults("VehicleStatusType Results");
})();
