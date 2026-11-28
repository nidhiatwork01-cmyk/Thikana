import { FastifyInstance } from "fastify";
import { z } from "zod";
import { listingsService } from "./listings.service.js";
import { pgFilterQuerySchema, createPgSchema, updatePgSchema } from "./listings.schema.js";
import { authenticate, requireRole } from "../../middlewares/auth.js";
import { ApiResponse, PaginatedResponse } from "@thikana/shared-types";

export async function listingsRoutes(app: FastifyInstance) {
  // Public Faceted PG Search & Listing
  app.get("/", async (request, reply) => {
    const query = pgFilterQuerySchema.parse(request.query);
    const result = await listingsService.listPgs(query);

    const response: ApiResponse<PaginatedResponse<any>> = {
      success: true,
      data: result,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id
      }
    };
    return reply.status(200).send(response);
  });

  // Get PG Details by ID or Slug
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const pg = await listingsService.getPgById(id);

    const response: ApiResponse<any> = {
      success: true,
      data: pg,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id
      }
    };
    return reply.status(200).send(response);
  });

  // Create PG Listing (Owner or Admin)
  app.post(
    "/",
    { preHandler: [authenticate, requireRole("OWNER", "ADMIN")] },
    async (request, reply) => {
      const input = createPgSchema.parse(request.body);
      const created = await listingsService.createPg(request.user!.userId, input);

      const response: ApiResponse<any> = {
        success: true,
        data: created,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id
        }
      };
      return reply.status(201).send(response);
    }
  );

  // Update PG Listing (Owner or Admin)
  app.patch(
    "/:id",
    { preHandler: [authenticate, requireRole("OWNER", "ADMIN")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updatePgSchema.parse(request.body);
      const updated = await listingsService.updatePg(
        id,
        request.user!.userId,
        request.user!.roles,
        input
      );

      const response: ApiResponse<any> = {
        success: true,
        data: updated,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id
        }
      };
      return reply.status(200).send(response);
    }
  );

  // Delete PG Listing (Soft Delete)
  app.delete(
    "/:id",
    { preHandler: [authenticate, requireRole("OWNER", "ADMIN")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await listingsService.deletePg(
        id,
        request.user!.userId,
        request.user!.roles
      );

      const response: ApiResponse<any> = {
        success: true,
        data: result,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id
        }
      };
      return reply.status(200).send(response);
    }
  );

  // Add Community Review to a PG Listing
  app.post("/:id/reviews", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        rating: z.number().int().min(1).max(5),
        comment: z.string().min(5, "Review must be at least 5 characters"),
        reviewerName: z.string().optional(),
      })
      .parse(request.body);

    const review = await listingsService.createReview(
      id,
      body.rating,
      body.comment,
      body.reviewerName
    );

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
