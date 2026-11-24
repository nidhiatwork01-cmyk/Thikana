import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";
import { closeQueues } from "../src/jobs/index.js";
import { FastifyInstance } from "fastify";

describe("Phase 4: Commute Engine Integration Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeQueues();
    await redis.quit();
    await prisma.$disconnect();
  });

  it("POST /api/v1/commute/zones - generates isochrone polygon around Cyber Towers", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/commute/zones",
      payload: {
        destination: { lat: 17.4504, lng: 78.3808 }, // Cyber Towers, HITEC City
        arrivalTime: "09:30",
        travelMode: "bike",
        maxMinutes: 30,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.type).toBe("FeatureCollection");
    expect(json.data.features.length).toBeGreaterThan(0);

    const feature = json.data.features[0];
    expect(feature.geometry.type).toBe("Polygon");
    expect(feature.geometry.coordinates[0].length).toBeGreaterThan(10);
    expect(feature.properties.value).toBe(30);
    expect(["openrouteservice", "hyderabad-calibrated-model"]).toContain(
      json.data.metadata.provider
    );
  });

  it("POST /api/v1/commute/zones - validates coordinate bounds (rejects non-Hyderabad coords)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/commute/zones",
      payload: {
        destination: { lat: 28.6139, lng: 77.209 }, // New Delhi (outside Hyderabad)
        arrivalTime: "09:30",
        travelMode: "bike",
        maxMinutes: 30,
      },
    });

    expect(res.statusCode).toBe(422); // Validation error
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(false);
  });

  it("GET /api/v1/commute/search - finds PGs within 30 min of HITEC City", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/commute/search?destLat=17.4504&destLng=78.3808&travelMode=bike&maxMinutes=30&arrivalTime=09:30",
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.pgs).toBeDefined();
    expect(Array.isArray(json.data.pgs)).toBe(true);
    expect(json.data.pgs.length).toBeGreaterThan(0);

    const firstPg = json.data.pgs[0];
    expect(firstPg.estimatedCommuteMinutes).toBeDefined();
    expect(firstPg.distanceKm).toBeDefined();
    expect(firstPg.estimatedCommuteMinutes).toBeLessThanOrEqual(35); // within 30 min + tolerance
    expect(firstPg.title).toBeDefined();
    expect(firstPg.minRent).toBeGreaterThan(0);
  });

  it("GET /api/v1/commute/search - filters by gender and maxBudget", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/commute/search?destLat=17.4504&destLng=78.3808&travelMode=bike&maxMinutes=30&gender=MEN&maxBudget=15000",
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    for (const pg of json.data.pgs) {
      expect(pg.gender).toBe("MEN");
      expect(pg.minRent).toBeLessThanOrEqual(15000);
    }
  });

  it("POST /api/v1/commute/zones/async - enqueues job and returns 202 Accepted", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/commute/zones/async",
      payload: {
        destination: { lat: 17.4504, lng: 78.3808 },
        arrivalTime: "09:30",
        travelMode: "bike",
        maxMinutes: 25,
      },
    });

    expect(res.statusCode).toBe(202);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.jobId).toBeDefined();
    expect(json.data.status).toBe("queued");

    // Check job status endpoint
    const statusRes = await app.inject({
      method: "GET",
      url: `/api/v1/commute/jobs/${json.data.jobId}`,
    });

    expect(statusRes.statusCode).toBe(200);
    const statusJson = JSON.parse(statusRes.payload);
    expect(statusJson.success).toBe(true);
    expect(["waiting", "active", "completed"]).toContain(statusJson.data.state);
  });
});
