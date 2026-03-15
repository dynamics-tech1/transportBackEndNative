#!/usr/bin/env node
/**
 * User CRUD and Auth Test Suite
 */

"use strict";

require("dotenv").config();
const { setup, request, auth, test, assert, printResults } = require("./testHelper");

const state = {
  phoneNumber: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
  email: `testuser_${Date.now()}@example.com`,
  fullName: "Test User Refactor",
  roleId: 2, // Driver (from ListOfSeedData.js)
  userUniqueId: null,
  token: null,
  adminToken: null, // Added adminToken to state
};

const userAuth = () => ({ Authorization: `Bearer ${state.token}` });

(async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  User Management Baseline Tests              ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  await setup();

  // Get admin token for tests that require admin privileges
  await test("Get Admin Token", async () => {
    const adminAuthResult = await auth();
    assert(adminAuthResult.Authorization, "Admin token not acquired");
    state.adminToken = adminAuthResult.Authorization.split(" ")[1]; // Extract token string
    return "Admin token acquired";
  });

  // ── AUTHENTICATION FLOW ────────────────────────────────────────────────
  await test("Create User (Driver Sign-up)", async () => {
    const res = await request(
      "POST",
      "/api/user/createUser",
      {
        fullName: state.fullName,
        phoneNumber: state.phoneNumber,
        email: state.email,
        roleId: state.roleId,
        userRoleStatusDescription: "Testing refactor",
      }
    );
    assert(res.body?.message === "success", `Sign-up failed: ${JSON.stringify(res.body)}`);
    state.userUniqueId = res.body?.data?.userUniqueId;
    return `Signed up: ${state.userUniqueId}`;
  });

  await test("Verify User by OTP (Login Flow)", async () => {
    assert(state.userUniqueId, "No userUniqueId from sign-up");
    
    // In our test environment, the mock SMS sender logs the OTP or we can fetch it from DB.
    // However, verifyUserByOTP currently checks the 'usersCredential' table.
    // Let's assume the test helper or environment allows us to bypass or we fetch it.
    const { pool } = require("../Middleware/Database.config");
    await pool.query("SELECT OTP FROM usersCredential WHERE userUniqueId = ?", [state.userUniqueId]);
    
    // Note: OTP in DB is hashed. But the controller/service compares it.
    // For testing purposes, we might need a way to set a known OTP if bcrypt hashing prevents easy retrieval.
    // Alternatively, we use the fact that the service might accept the raw OTP if we can intercept it.
    // Let's try to mock the OTP to '123456' manually for this test.
    const bcrypt = require("bcryptjs");
    const testOtp = "123456";
    const hashed = await bcrypt.hash(testOtp, 10);
    await pool.query("UPDATE usersCredential SET OTP = ? WHERE userUniqueId = ?", [hashed, state.userUniqueId]);

    const res = await request(
      "POST",
      "/api/user/verifyUserByOTP",
      {
        phoneNumber: state.phoneNumber,
        OTP: testOtp,
        roleId: state.roleId,
      }
    );
    
    assert(res.body?.message === "success", `OTP verification failed: ${JSON.stringify(res.body)}`);
    state.token = res.body?.token;
    assert(state.token, "No JWT token returned");
    return "OTP Verified, JWT acquired";
  });

  // ── PROFILE MANAGEMENT ──────────────────────────────────────────────────
  await test("Update User Profile (Self) - Driver Restriction", async () => {
    assert(state.token, "No token available");
    const res = await request(
      "PUT",
      "/api/user/updateUser/self",
      { fullName: "Updated Test Name" },
      userAuth()
    );
    // CURRENT LOGIC: Drivers can only update if fullName or email is MISSING.
    // Since we provided them at sign-up, this should return 403.
    assert(res.status === 403, `Expected 403 for driver update, got ${res.status}. Body: ${JSON.stringify(res.body)}`);
    return "Driver update restriction verified (baseline behavior)";
  });

  // ── ADMIN FILTERS ───────────────────────────────────────────────────────
  await test("Admin: Get User by Filter", async () => {
    const res = await request(
      "GET",
      `/api/admin/getUserByFilterDetailed?search=${encodeURIComponent(state.phoneNumber)}`,
      null,
      auth() // Admin auth
    );
    assert(res.body?.message === "success", `Filter failed: status ${res.status}, body ${JSON.stringify(res.body)}`);
    const data = res.body?.data || [];
    const found = data.find(u => u.user.userUniqueId === state.userUniqueId);
    assert(found, "Could not find created user via admin filter");
    return "User found via detailed filter";
  });

  // ── DELETION ────────────────────────────────────────────────────────────
  await test("Delete User (Soft Delete)", async () => {
    // New route: DELETE /api/user/users/:userUniqueId
    const res = await request(
      "DELETE",
      `/api/user/users/self`,
      null,
      userAuth()
    );
    assert(res.body?.message === "success", `Deletion failed: status ${res.status}, body ${JSON.stringify(res.body)}`);
    return "User soft-deleted successfully";
  });

  await test("Verify user hidden after deletion", async () => {
    const res = await request("GET", `/api/admin/getUserByFilterDetailed?search=${state.phoneNumber}`, null, {
      Authorization: `Bearer ${state.adminToken}`,
    });
    assert(res.status === 200, "Get users failed");
    // It should not be in the results if includeDeleted is not set
    const data = res.body?.data || [];
    const found = data.find(u => u.user.userUniqueId === state.userUniqueId);
    assert(!found, "Soft-deleted user still visible in admin filter");
    return "User correctly hidden from results";
  });

  printResults("User Management Results");
  process.exit(0);
})();
