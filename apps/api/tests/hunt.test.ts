import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";
import { closeQueues } from "../src/jobs/index.js";
import { FastifyInstance } from "fastify";

describe("Phase 7: Hunt Copilot & TSP Route Optimizer Tests", () => {
  let app: FastifyInstance;
  let createdHuntItemId: string;

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

  it("POST /api/v1/hunt - creates a new PG hunt candidate", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/hunt",
      payload: {
        name: "Sri Sai Luxury PG Kondapur",
        address: "Near Botanical Garden Road, Kondapur, Hyderabad",
        location: { lat: 17.4645, lng: 78.3621 },
        rent: 9500,
        phone: "+919876543111",
        sourceUrl: "https://maps.google.com/?q=17.4645,78.3621",
        checklist: {
          waterPressure: 4,
          waterSmellClean: true,
          ventilationSunlight: 4,
          trafficNoiseLevel: 3,
          safetyCctvPresent: true,
          visitorPolicy: "DAY_ONLY",
          noticePeriodDays: 30,
          lockInMonths: 0,
          notes: "Spacious balcony, owner seems decent",
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
    expect(json.data.name).toBe("Sri Sai Luxury PG Kondapur");
    expect(json.data.rent).toBe(9500);

    createdHuntItemId = json.data.id;
  });

  it("GET /api/v1/hunt - lists user hunt workspace items", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/hunt",
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  it("PATCH /api/v1/hunt/:id - updates on-site inspection checklist", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/hunt/${createdHuntItemId}`,
      payload: {
        status: "VISITED",
        checklist: {
          waterPressure: 5,
          waterSmellClean: true,
          ventilationSunlight: 5,
          trafficNoiseLevel: 4,
          safetyCctvPresent: true,
          visitorPolicy: "ANYTIME",
          noticePeriodDays: 30,
          lockInMonths: 0,
          notes: "Checked in person. Water pressure is great. Food is hygienic.",
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("VISITED");
    expect(json.data.checklist.waterPressure).toBe(5);
  });

  it("POST /api/v1/hunt/:id/score - computes personal weighted score", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/hunt/${createdHuntItemId}/score`,
      payload: {
        commute: 0.3,
        price: 0.25,
        cleanliness: 0.2,
        safety: 0.15,
        vibe: 0.1,
        food: 0.0,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.score).toBeGreaterThan(60);
    expect(json.data.breakdown).toBeDefined();
    expect(json.data.breakdown.cleanliness).toBeGreaterThan(70);
  });

  it("POST /api/v1/hunt/optimize-route - 2-opt TSP route optimization", async () => {
    // Add a second item so we can test route optimization across multiple stops
    const secondRes = await app.inject({
      method: "POST",
      url: "/api/v1/hunt",
      payload: {
        name: "Elite Coliving Madhapur",
        address: "Ayyappa Society, Madhapur, Hyderabad",
        location: { lat: 17.4475, lng: 78.3885 },
        rent: 14000,
      },
    });
    const secondId = JSON.parse(secondRes.payload).data.id;

    // Plan route starting from Cyber Towers (17.4504, 78.3808)
    const planRes = await app.inject({
      method: "POST",
      url: "/api/v1/hunt/optimize-route",
      payload: {
        startLocation: { lat: 17.4504, lng: 78.3808 },
        huntItemIds: [createdHuntItemId, secondId],
        dayStartTime: "10:00",
        minutesPerVisit: 45,
      },
    });

    expect(planRes.statusCode).toBe(200);
    const planJson = JSON.parse(planRes.payload);
    expect(planJson.success).toBe(true);
    expect(planJson.data.orderedItems.length).toBe(2);
    expect(planJson.data.timeline.length).toBe(2);
    expect(planJson.data.timeline[0].arrivalTime).toBeDefined();
    expect(planJson.data.legs.length).toBe(2);
    expect(planJson.data.legs[0].googleMapsUrl).toContain("google.com/maps");
    expect(planJson.data.totalDistanceKm).toBeGreaterThan(0);
    expect(planJson.data.totalTimeMinutes).toBeGreaterThan(90);
  });
});
