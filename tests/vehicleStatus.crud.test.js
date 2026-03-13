#!/usr/bin/env node
/**
 * VehicleStatus CRUD Test Suite (Robust Edition)
 */

"use strict";

const { setup, request, auth, test, assert, printResults } = require("./testHelper");

const state = {
  vehicleUniqueId: null,
  VehicleStatusTypeId: null,
  vehicleStatusUniqueId: null,
};

(async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  VehicleStatus CRUD Tests (Robust)           ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await setup();

  // ── Prerequisites ───────────────────────────────────────────────────────
  await test("Fetch or Create vehicle", async () => {
    // Try to find a vehicle
    const res = await request("GET", "/api/admin/vehicleOwnerships?limit=1", null, auth());
    const data = res.body?.data || [];
    if (data.length > 0) {
      state.vehicleUniqueId = data[0]?.vehicle?.uniqueId || data[0]?.vehicleUniqueId;
    }
    
    if (!state.vehicleUniqueId) {
      // Create a dummy vehicle if possible (depends on Vehicle routes, but let's try a direct GET first)
      const res2 = await request("GET", "/api/admin/vehicle-types", null, auth());
      const vTypes = res2.body?.data || [];
      // If we can't create one, we need to fail
      assert(state.vehicleUniqueId, "No vehicles found. Ensure at least one vehicle exists in the system.");
    }
    return `Using vehicle: ${state.vehicleUniqueId}`;
  });

  await test("Fetch or Create status type", async () => {
    const res = await request("GET", "/vehicleStatusTypes", null, auth());
    const data = res.body?.data || [];
    if (data.length > 0) {
      state.VehicleStatusTypeId = data[0].VehicleStatusTypeId;
    } else {
      // Create one
      const createRes = await request("POST", "/vehicleStatusType", {
        typeName: `Status_${Date.now()}`,
        description: "Auto-created for test"
      }, auth());
      // List again to get ID
      const res2 = await request("GET", "/vehicleStatusTypes", null, auth());
      state.VehicleStatusTypeId = res2.body?.data?.[0]?.VehicleStatusTypeId;
    }
    assert(state.VehicleStatusTypeId, "Failed to get or create status type");
    return `Using VehicleStatusTypeId: ${state.VehicleStatusTypeId}`;
  });

  // ── CREATE ──────────────────────────────────────────────────────────────
  await test("Create vehicle status", async () => {
    const res = await request(
      "POST",
      "/vehicleStatus",
      {
        vehicleUniqueId: state.vehicleUniqueId,
        VehicleStatusTypeId: state.VehicleStatusTypeId,
        remark: "Initial remark",
      },
      auth(),
    );
    assert(res.body?.message === "success", `Create failed: ${JSON.stringify(res.body)}`);
    return "Created successfully";
  });

  await test("Lookup created status UUID", async () => {
    const res = await request(
      "GET",
      `/vehicleStatus?vehicleUniqueId=${state.vehicleUniqueId}`,
      null,
      auth(),
    );
    const data = res.body?.data || [];
    const found = data.find(d => d.vehicleUniqueId === state.vehicleUniqueId && d.isDeleted === 0);
    assert(found, "Could not find created status in list");
    state.vehicleStatusUniqueId = found.vehicleStatusUniqueId;
    return `Found UUID: ${state.vehicleStatusUniqueId}`;
  });

  // ── READ ────────────────────────────────────────────────────────────────
  await test("Get status by UUID via filter", async () => {
    assert(state.vehicleStatusUniqueId, "No UUID available");
    const res = await request(
      "GET",
      `/vehicleStatus?vehicleStatusUniqueId=${state.vehicleStatusUniqueId}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", "Filter failed");
    const data = res.body?.data || [];
    assert(data.length > 0, "No result for UUID filter");
    return `Verified UUID: ${data[0].vehicleStatusUniqueId}`;
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────
  await test("Update status by UUID", async () => {
    assert(state.vehicleStatusUniqueId, "No UUID available");
    const res = await request(
      "PUT",
      `/vehicleStatus/${state.vehicleStatusUniqueId}`,
      { VehicleStatusTypeId: state.VehicleStatusTypeId },
      auth(),
    );
    assert(res.body?.message === "success", `Update failed: ${JSON.stringify(res.body)}`);
    return "Updated successfully";
  });

  // ── DELETE ──────────────────────────────────────────────────────────────
  await test("Soft-delete by UUID", async () => {
    assert(state.vehicleStatusUniqueId, "No UUID available");
    const res = await request(
      "DELETE",
      `/vehicleStatus/${state.vehicleStatusUniqueId}`,
      null,
      auth(),
    );
    assert(res.body?.message === "success", "Delete failed");
    return "Soft-deleted";
  });

  printResults("VehicleStatus Results");
})();
