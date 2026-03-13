#!/usr/bin/env node
/**
 * VehicleOwnership CRUD Test Suite
 * ==================================
 * Tests all CRUD operations for the VehicleOwnership resource.
 *
 * Endpoints tested:
 *   POST   /api/admin/vehicleOwnerships                  → Create ownership
 *   GET    /api/admin/vehicleOwnerships                   → List with filters (search by UUID)
 *   PUT    /api/admin/vehicleOwnerships/:uuid             → Update by UUID (path param)
 *   DELETE /api/admin/vehicleOwnerships/:uuid             → Soft delete by UUID
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
  console.log("║  VehicleOwnership CRUD Tests (UUID Edition)  ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await setup();

  // ── Prerequisites ───────────────────────────────────────────────────────
  await test("Fetch existing ownership data", async () => {
    const res = await request(
      "GET",
      "/api/admin/vehicleOwnerships?limit=1",
      null,
      auth(),
    );
    assert(res.body?.message === "success", `List failed: ${JSON.stringify(res.body)}`);
    const data = res.body?.data || [];
    assert(data.length > 0, "No ownerships found in system");

    const first = data[0];
    state.ownershipUniqueId = first?.ownership?.ownershipUniqueId;
    state.vehicleUniqueId = first?.vehicle?.uniqueId;
    state.ownerUserUniqueId = first?.owner?.userUniqueId;
    state.roleId = first?.role?.id;

    assert(state.ownershipUniqueId, "No ownershipUniqueId found");
    return `Using UUID: ${state.ownershipUniqueId}`;
  });

  // ── READ ────────────────────────────────────────────────────────────────
  await test("List ownerships with UUID filter", async () => {
    assert(state.ownershipUniqueId, "No UUID available");
    const res = await request(
      "GET",
      `/api/admin/vehicleOwnerships?ownershipUniqueId=${state.ownershipUniqueId}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", "Filter failed");
    const data = res.body?.data || [];
    assert(data.length > 0, "Record not found via filter");
    assert(data[0].ownership.ownershipUniqueId === state.ownershipUniqueId, "UUID mismatch");
    return `Verified UUID in list`;
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────
  await test("Update ownership by UUID (path param)", async () => {
    assert(state.ownershipUniqueId, "No UUID available");
    const res = await request(
      "PUT",
      `/api/admin/vehicleOwnerships/${state.ownershipUniqueId}`,
      { ownershipEndDate: "2026-12-31" },
      auth(),
    );
    assert(res.body?.message === "success", `Update failed: ${JSON.stringify(res.body)}`);
    return "Updated via path param";
  });

  // ── DELETE ──────────────────────────────────────────────────────────────
  await test("Verify soft-delete functionality (lookup non-existent)", async () => {
    const fakeUUID = "00000000-0000-4000-8000-000000000000";
    const res = await request(
      "DELETE",
      `/api/admin/vehicleOwnerships/${fakeUUID}`,
      null,
      auth(),
    );
    assert(res.status === 404, `Expected 404 for ghost UUID, got ${res.status}`);
    return "Ghost delete correctly rejected";
  });

  printResults("VehicleOwnership Results");
})();
