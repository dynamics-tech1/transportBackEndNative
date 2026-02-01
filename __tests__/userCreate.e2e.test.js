const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
jest.setTimeout(30000);
const request = require("supertest");
const app = require("../Config/Express.config");

describe("Create User E2E", () => {
  test("create user returns 200", async () => {
    const phoneNumber = `+2519${Date.now().toString().slice(-9)}`;
    const res = await request(app)
      .post("/api/user/createUser")
      .send({
        fullName: "E2E Create User",
        phoneNumber,
        email: `e2e.create.${Date.now()}@example.com`,
        roleId: 2,
        statusId: 2,
        userRoleStatusDescription: "E2E create user test",
        // subscriptionPlanPricingUniqueId: DEFAULT_PRICING_ID,
      })
      .expect(200);

    expect(res.status).toBe(200);
  });
});
