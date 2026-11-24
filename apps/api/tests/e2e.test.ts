import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { FastifyInstance } from "fastify";

describe("Phase 3: Backend Core Integration Suite", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("GET /api/v1/health - should return healthy envelope", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/health" });
    const json = JSON.parse(res.payload);
    expect(res.statusCode).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.app).toBe("Thikana");
  });

  it("GET /api/v1/meta/localities - should list Hyderabad localities", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/meta/localities" });
    const json = JSON.parse(res.payload);
    expect(res.statusCode).toBe(200);
    expect(json.data.length).toBeGreaterThanOrEqual(10);
  });

  it("Auth Flow: Signup -> Login -> Me", async () => {
    const email = `vitest_${Date.now()}@thikana.local`;
    const password = "ValidPassword@123";

    // 1. Signup
    const signupRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        email,
        password,
        fullName: "Test Seeker",
        phone: "+919876543999"
      }
    });
    expect(signupRes.statusCode).toBe(201);
    const signupData = JSON.parse(signupRes.payload).data;
    expect(signupData.tokens.accessToken).toBeDefined();

    // 2. Login
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password }
    });
    expect(loginRes.statusCode).toBe(200);
    const token = JSON.parse(loginRes.payload).data.tokens.accessToken;

    // 3. Me profile
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(meRes.statusCode).toBe(200);
    expect(JSON.parse(meRes.payload).data.email).toBe(email);
  });

  it("GET /api/v1/pgs - should paginate Hyderabad listings", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/pgs?locality=hitec-city&limit=3"
    });
    const json = JSON.parse(res.payload);
    expect(res.statusCode).toBe(200);
    expect(json.data.items.length).toBeGreaterThan(0);
    expect(json.data.hasMore).toBeDefined();
  });
});
