import { FastifyInstance, FastifyRequest } from "fastify";
import {
  listBuddiesQuerySchema,
  createHelpRequestSchema,
  updateHelpRequestStatusSchema,
  sharePhoneConsentSchema,
  createBuddyReviewSchema,
  optInBuddySchema,
} from "./buddy.schema.js";
import { buddyService } from "./buddy.service.js";
import { prisma } from "../../lib/prisma.js";
import { verifyAccessToken } from "../../lib/jwt.js";
import type { ApiResponse } from "@thikana/shared-types";

/**
 * Helper to resolve user ID from Bearer token or fallback to demo seeker in development
 */
async function resolveUserId(request: FastifyRequest): Promise<string> {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      return payload.userId;
    } catch {
      // Fall through to demo user in dev
    }
  }

  const demoUser = await prisma.user.findFirst({
    where: { email: "seeker@gmail.com" },
  });
  if (demoUser) {
    return demoUser.id;
  }

  const firstUser = await prisma.user.findFirst();
  if (firstUser) {
    return firstUser.id;
  }

  throw new Error("No user available for Buddy operations");
}

export async function buddyRoutes(app: FastifyInstance) {
  // 1. List Local Buddies with filters
  app.get("/", async (request, reply) => {
    const query = listBuddiesQuerySchema.parse(request.query);
    const buddies = await buddyService.listBuddies(query);

    const response: ApiResponse<typeof buddies> = {
      success: true,
      data: buddies,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // 1b. Opt-in as a real Local Buddy
  app.post("/opt-in", async (request, reply) => {
    const input = optInBuddySchema.parse(request.body);
    const created = await buddyService.optInAsBuddy(input);

    const response: ApiResponse<typeof created> = {
      success: true,
      data: created,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(201).send(response);
  });

  // 2. Get Single Buddy Profile
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const buddy = await buddyService.getBuddyById(id);

    const response: ApiResponse<typeof buddy> = {
      success: true,
      data: buddy,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // 3. Create Help Request
  app.post("/requests", async (request, reply) => {
    const userId = await resolveUserId(request);
    const input = createHelpRequestSchema.parse(request.body);
    const created = await buddyService.createHelpRequest(userId, input);

    const response: ApiResponse<typeof created> = {
      success: true,
      data: created,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(201).send(response);
  });

  // 4. Get My Help Requests
  app.get("/requests", async (request, reply) => {
    const userId = await resolveUserId(request);
    const requests = await buddyService.getMyHelpRequests(userId);

    const response: ApiResponse<typeof requests> = {
      success: true,
      data: requests,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // 5. Update Help Request Status (State Machine)
  app.patch("/requests/:id/status", async (request, reply) => {
    const userId = await resolveUserId(request);
    const { id } = request.params as { id: string };
    const { status } = updateHelpRequestStatusSchema.parse(request.body);
    const updated = await buddyService.updateHelpRequestStatus(userId, id, status);

    const response: ApiResponse<typeof updated> = {
      success: true,
      data: updated,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // 6. Dual-Consent Phone Share Toggle
  app.post("/requests/:id/share-phone", async (request, reply) => {
    const userId = await resolveUserId(request);
    const { id } = request.params as { id: string };
    const { share } = sharePhoneConsentSchema.parse(request.body);
    const updated = await buddyService.sharePhoneConsent(userId, id, share);

    const response: ApiResponse<typeof updated> = {
      success: true,
      data: updated,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // 7. Submit Review for Completed Request
  app.post("/requests/:id/review", async (request, reply) => {
    const userId = await resolveUserId(request);
    const { id } = request.params as { id: string };
    const input = createBuddyReviewSchema.parse(request.body);
    const review = await buddyService.createReview(userId, id, input);

    const response: ApiResponse<typeof review> = {
      success: true,
      data: review,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(201).send(response);
  });
}
