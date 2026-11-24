import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";
import { closeQueues } from "../src/jobs/index.js";
import { FastifyInstance } from "fastify";
import { analyzeMessageForScam } from "../src/modules/chat/scam-detector.js";

describe("Phase 8, 9 & 10: Local Buddies, Chat & Anti-Scam Heuristics Integration Tests", () => {
  let app: FastifyInstance;
  let sampleBuddyId: string;
  let createdRequestId: string;

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

  it("GET /api/v1/buddies - lists seeded Hyderabad local buddies", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/buddies",
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(10);

    const first = json.data[0];
    expect(first.fullName).toBeDefined();
    expect(first.hourlyFee).toBeGreaterThanOrEqual(100);
    expect(first.isDeclaredNotBroker).toBe(true);
    expect(first.serviceLocalities.length).toBeGreaterThan(0);

    sampleBuddyId = first.id;
  });

  it("GET /api/v1/buddies - filters by locality", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/buddies?locality=Madhapur",
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    for (const buddy of json.data) {
      expect(buddy.serviceLocalities).toContain("Madhapur");
    }
  });

  it("POST /api/v1/buddies/requests - creates a help request", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/buddies/requests",
      payload: {
        buddyId: sampleBuddyId,
        channel: "TEXT",
        targetLocalities: ["Madhapur", "HITEC City"],
        maxBudget: 12000,
        note: "Moving next month, need advice on water supply & power backup in Ayyappa Society",
        agreedFee: 150,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("REQUESTED");
    expect(json.data.agreedFee).toBe(150);
    expect(json.data.isPhoneRevealed).toBeFalsy();

    createdRequestId = json.data.id;
  });

  it("GET /api/v1/buddies/requests - lists active user requests", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/buddies/requests",
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.some((r: any) => r.id === createdRequestId)).toBe(true);
  });

  it("POST /api/v1/buddies/requests/:id/share-phone - respects dual-consent phone privacy", async () => {
    // 1. Seeker shares phone
    const res1 = await app.inject({
      method: "POST",
      url: `/api/v1/buddies/requests/${createdRequestId}/share-phone`,
      payload: { share: true },
    });

    expect(res1.statusCode).toBe(200);
    const json1 = JSON.parse(res1.payload);
    expect(json1.data.seekerSharedPhone).toBe(true);
    expect(json1.data.buddySharedPhone).toBe(false);
    expect(json1.data.isPhoneRevealed).toBe(false); // Hidden because buddy hasn't consented yet
    expect(json1.data.buddyPhone).toBeNull();
  });

  // -------------------------------------------------------------
  // Phase 10: Anti-Scam Heuristics Engine Tests
  // -------------------------------------------------------------
  it("Phase 10 Heuristic: flags gate pass fee scam pattern with high risk score", () => {
    const message = "Please pay ₹1,000 gate pass fee before visit. It will be refunded at the gate.";
    const result = analyzeMessageForScam(message);

    expect(result.isScam).toBe(true);
    expect(result.riskLevel).toBe("HIGH");
    expect(result.matchedRules).toContain("Gate Pass / Entry Fee Scam");
    expect(result.advisory).toContain("NEVER charge a 'gate pass'");
  });

  it("Phase 10 Heuristic: flags military impersonation and advance token scams", () => {
    const message = "I am an army officer posted in cantonment. Pay token advance before seeing the room.";
    const result = analyzeMessageForScam(message);

    expect(result.isScam).toBe(true);
    expect(result.matchedRules).toContain("Armed Forces Impersonation Scam");
    expect(result.matchedRules).toContain("Advance Deposit Before Viewing");
  });

  it("Phase 10 Heuristic: flags reverse UPI QR code scams", () => {
    const message = "Scan this QR code and enter your UPI PIN to receive the advance refund.";
    const result = analyzeMessageForScam(message);

    expect(result.isScam).toBe(true);
    expect(result.matchedRules).toContain("Reverse QR Code UPI Scam");
    expect(result.advisory).toContain("NEVER need to enter a UPI PIN to receive money");
  });

  it("Phase 10 Heuristic: allows legitimate tenant and PG inquiry messages", () => {
    const cleanMessage = "Hi! Is the water supply in Madhapur 24/7 or depends on tankers? Also how is the Wi-Fi speed?";
    const result = analyzeMessageForScam(cleanMessage);

    expect(result.isScam).toBe(false);
    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe("LOW");
    expect(result.advisory).toBeNull();
  });

  // -------------------------------------------------------------
  // Phase 9: Real-Time In-Request Chat Endpoints
  // -------------------------------------------------------------
  it("Phase 9: GET /api/v1/chat/:requestId/messages - returns initial empty message history", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/chat/${createdRequestId}/messages`,
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(0);
  });

  it("Phase 9 & 10: POST /api/v1/chat/:requestId/messages - posts legitimate message successfully", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/chat/${createdRequestId}/messages`,
      payload: {
        text: "Hi! Can you check if the 2-sharing room has an attached bathroom and power backup?",
        tempId: "temp-123",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.message.text).toContain("attached bathroom");
    expect(json.data.message.isFlaggedScam).toBe(false);
    expect(json.data.message.tempId).toBe("temp-123");
    expect(json.data.scamAnalysis.isScam).toBe(false);
  });

  it("Phase 9 & 10: POST /api/v1/chat/:requestId/messages - detects scam keyword and flags message", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/chat/${createdRequestId}/messages`,
      payload: {
        text: "Sure, but first you need to pay visitor pass fee of ₹500 via Google Pay.",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.message.isFlaggedScam).toBe(true);
    expect(json.data.scamAnalysis.isScam).toBe(true);
    expect(json.data.scamAnalysis.advisory).toBeDefined();
  });

  it("Phase 9: POST /api/v1/chat/:requestId/read - marks messages as read", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/chat/${createdRequestId}/read`,
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
  });

  it("Phase 9: GET /api/v1/chat/:requestId/messages - retrieves all messages with scam flags intact", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/chat/${createdRequestId}/messages`,
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(2);

    const scamMsg = json.data.find((m: any) => m.text.includes("visitor pass"));
    expect(scamMsg).toBeDefined();
    expect(scamMsg.isFlaggedScam).toBe(true);
  });
});
