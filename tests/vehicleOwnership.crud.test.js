#!/usr/bin/env node
/**
 * VehicleOwnership CRUD Test Suite
 * ==================================
 * Tests all CRUD operations for the VehicleOwnership resource.
 *
 * Endpoints tested:
 *   POST   /api/admin/vehicleOwnerships                  → Create ownership
 *   GET    /api/admin/vehicleOwnerships                   → List with filters + pagination
 *   PUT    /api/admin/vehicleOwnerships                   → Update (ownershipUniqueId in query)
 *   DELETE /api/admin/vehicleOwnerships/:ownershipId      → Delete by ownershipId (UUID or int)
 *
 * Required fields for CREATE:
 *   - vehicleUniqueId (UUID, FK to Vehicle)
 *   - ownerUserUniqueId (UUID, FK to Users)
 *   - roleId (integer, FK to Roles — vehicleOwnerRoleId)
 *   - ownershipStartDate (date string)
 *
 * Notes:
 *   - Update uses ownershipUniqueId in QUERY params (not body or path)
 *   - Delete uses ownershipId in URL path param (UUID or integer)
 *   - GET returns formatted data with ownership/owner/vehicle/role objects
 *   - Overlap check prevents duplicate active ownerships for same vehicle
 *   - Hard deletes (not soft)
 *
 * Prerequisites:
 *   - At least one Vehicle, one User, and the vehicleOwner role must exist
 *
 * Usage:
 *   node tests/vehicleOwnership.crud.test.js
 */

"use strict";

const { setup, request, auth, test, assert, printResults } = require("./testHelper");

const state = {
  vehicleUniqueId: null,
  ownerUserUniqueId: null,
  roleId: null,
  ownershipUniqueId: null,
};

(async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  VehicleOwnership CRUD Tests                 ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await setup();

  // ── Prerequisites ───────────────────────────────────────────────────────
  console.log("━━ Prerequisites ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await test("Fetch existing ownership data (vehicle + owner + role)", async () => {
    const res = await request(
      "GET",
      "/api/admin/vehicleOwnerships?limit=1&includePagination=true",
      null,
      auth(),
    );
    assert(res.body?.message === "success", `List failed: ${JSON.stringify(res.body)}`);
    const data = res.body?.data || [];
    assert(data.length > 0, "No ownerships found — need at least one existing ownership");

    const first = data[0];
    state.vehicleUniqueId = first?.vehicle?.uniqueId;
    state.ownerUserUniqueId = first?.owner?.userUniqueId;
    state.roleId = first?.role?.id;

    assert(state.vehicleUniqueId, "No vehicleUniqueId found");
    assert(state.ownerUserUniqueId, "No ownerUserUniqueId found");
    assert(state.roleId, "No roleId found");
    return `vehicle: ${state.vehicleUniqueId}, owner: ${state.ownerUserUniqueId}, role: ${state.roleId}`;
  });

  // ── CRUD ────────────────────────────────────────────────────────────────
  console.log("\n━━ CRUD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Note: Creating a new ownership requires an unowned vehicle.
  // Instead of creating a new vehicle, we test the validation paths.

  await test("Create ownership — missing fields → should fail", async () => {
    const res = await request(
      "POST",
      "/api/admin/vehicleOwnerships",
      { vehicleUniqueId: state.vehicleUniqueId },
      auth(),
    );
    assert(res.status >= 400, `Expected validation error: ${JSON.stringify(res.body)}`);
    return "Correctly rejected — missing ownerUserUniqueId";
  });

  // ── READ ────────────────────────────────────────────────────────────────
  await test("List ownerships (no filter)", async () => {
    const res = await request("GET", "/api/admin/vehicleOwnerships", null, auth());
    assert(res.body?.message === "success", `List failed: ${JSON.stringify(res.body)}`);
    const data = res.body?.data || [];
    assert(data.length > 0, "No data returned");
    // Verify shapeof first item
    const first = data[0];
    assert(first.ownership, "Missing 'ownership' key in response shape");
    assert(first.vehicle, "Missing 'vehicle' key in response shape");
    return `Listed ${data.length} ownership(s)`;
  });

  await test("List with filter — by vehicleUniqueId", async () => {
    const res = await request(
      "GET",
      `/api/admin/vehicleOwnerships?vehicleUniqueId=${state.vehicleUniqueId}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Filter failed: ${JSON.stringify(res.body)}`);
    const data = res.body?.data || [];
    // Every result should match the vehicleUniqueId
    for (const d of data) {
      assert(
        d.vehicle?.uniqueId === state.vehicleUniqueId ||
          d.ownership?.vehicleUniqueId === state.vehicleUniqueId,
        `Mismatched vehicle: ${d.vehicle?.uniqueId}`,
      );
    }
    // Extract ownershipUniqueId for later tests
    if (data.length > 0) {
      state.ownershipUniqueId = data[0].ownership?.ownershipUniqueId;
    }
    return `Found ${data.length} record(s), using UUID: ${state.ownershipUniqueId}`;
  });

  await test("List with pagination", async () => {
    const res = await request(
      "GET",
      `/api/admin/vehicleOwnerships?limit=2&page=1&includePagination=true`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Pagination failed: ${JSON.stringify(res.body)}`);
    assert(res.body?.pagination, "Missing pagination object");
    return `Page ${res.body.pagination.currentPage}/${res.body.pagination.totalPages}`;
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────
  await test("Update ownership — requires ownershipUniqueId in query", async () => {
    assert(state.ownershipUniqueId, "No ownershipUniqueId — cannot update");
    const res = await request(
      "PUT",
      `/api/admin/vehicleOwnerships?ownershipUniqueId=${state.ownershipUniqueId}&ownershipEndDate=2026-12-31`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Update failed: ${JSON.stringify(res.body)}`);
    return "Updated ownershipEndDate";
  });

  await test("Update without ownershipUniqueId → should fail", async () => {
    const res = await request(
      "PUT",
      `/api/admin/vehicleOwnerships?ownershipEndDate=2026-12-31`,
      null,
      auth(),
    );
    assert(res.status >= 400, `Expected failure: ${JSON.stringify(res.body)}`);
    return "Correctly rejected — no ownershipUniqueId";
  });

  // Restore ownershipEndDate to NULL
  await test("Restore ownershipEndDate → NULL", async () => {
    const res = await request(
      "PUT",
      `/api/admin/vehicleOwnerships?ownershipUniqueId=${state.ownershipUniqueId}&ownershipEndDate=`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", `Restore failed: ${JSON.stringify(res.body)}`);
    return "Restored ownershipEndDate to NULL";
  });

  // ── DELETE ──────────────────────────────────────────────────────────────
  // We don't actually delete the existing ownership to avoid breaking data.
  // Instead, test invalid delete.
  await test("Delete with non-existent ID → should fail", async () => {
    const fakeUUID = "00000000-0000-4000-8000-000000000000";
    const res = await request(
      "DELETE",
      `/api/admin/vehicleOwnerships/${fakeUUID}`,
      null,
      auth(),
    );
    assert(res.status >= 400, `Expected failure: ${JSON.stringify(res.body)}`);
    return "Correctly rejected non-existent ID";
  });

  printResults("VehicleOwnership Results");
})();
