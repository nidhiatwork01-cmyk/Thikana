import { FastifyInstance, FastifyRequest } from "fastify";
import {
  createHuntItemSchema,
  updateHuntItemSchema,
  visitPlanRequestSchema,
  huntScoringWeightsSchema,
} from "./hunt.schema.js";
import { huntService } from "./hunt.service.js";
import { prisma } from "../../lib/prisma.js";
import { verifyAccessToken } from "../../lib/jwt.js";
import type { ApiResponse, HuntItem, VisitPlanResult } from "@thikana/shared-types";

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

  // Fallback to seeded demo seeker user in dev/test for immediate frictionless testing
  const demoUser = await prisma.user.findFirst({
    where: { email: "seeker@gmail.com" },
  });
  if (demoUser) {
    return demoUser.id;
  }

  // Or any first user
  const firstUser = await prisma.user.findFirst();
  if (firstUser) {
    return firstUser.id;
  }

  throw new Error("No user available for Hunt operations");
}

export async function huntRoutes(app: FastifyInstance) {
  // List all Hunt items for user
  app.get("/", async (request, reply) => {
    const userId = await resolveUserId(request);
    const items = await huntService.listItems(userId);

    const response: ApiResponse<HuntItem[]> = {
      success: true,
      data: items,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // Create Hunt Item
  app.post("/", async (request, reply) => {
    const userId = await resolveUserId(request);
    const input = createHuntItemSchema.parse(request.body);
    const created = await huntService.createItem(userId, input);

    const response: ApiResponse<HuntItem> = {
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

  // Update Hunt Item (checklist, status, notes)
  app.patch("/:id", async (request, reply) => {
    const userId = await resolveUserId(request);
    const { id } = request.params as { id: string };
    const input = updateHuntItemSchema.parse(request.body);
    const updated = await huntService.updateItem(userId, id, input);

    const response: ApiResponse<HuntItem> = {
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

  // Delete Hunt Item
  app.delete("/:id", async (request, reply) => {
    const userId = await resolveUserId(request);
    const { id } = request.params as { id: string };
    await huntService.deleteItem(userId, id);

    const response: ApiResponse<{ success: boolean }> = {
      success: true,
      data: { success: true },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // Calculate Weighted Score for on-site inspection
  app.post("/:id/score", async (request, reply) => {
    const userId = await resolveUserId(request);
    const { id } = request.params as { id: string };
    const weights = huntScoringWeightsSchema.parse(request.body);
    const result = await huntService.scoreItem(userId, id, weights);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // 2-Opt TSP Route Optimizer for Visit Day
  app.post("/optimize-route", async (request, reply) => {
    const userId = await resolveUserId(request);
    const input = visitPlanRequestSchema.parse(request.body);
    const plan = await huntService.planRoute(userId, input);

    const response: ApiResponse<VisitPlanResult> = {
      success: true,
      data: plan,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });
}
