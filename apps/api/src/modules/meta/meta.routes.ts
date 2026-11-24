import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { ApiResponse } from "@thikana/shared-types";

export async function metaRoutes(app: FastifyInstance) {
  // Localities with PG listing count
  app.get("/localities", async (request, reply) => {
    const localities = await prisma.locality.findMany({
      include: {
        _count: {
          select: {
            pgListings: {
              where: { isDeleted: false }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    });

    const formatted = localities.map((loc) => ({
      id: loc.id,
      name: loc.name,
      slug: loc.slug,
      latitude: loc.latitude,
      longitude: loc.longitude,
      pgCount: loc._count.pgListings
    }));

    const response: ApiResponse<typeof formatted> = {
      success: true,
      data: formatted,
      error: null,
      meta: { timestamp: new Date().toISOString(), requestId: request.id }
    };
    return reply.status(200).send(response);
  });

  // Hyderabad Tech & College Landmarks
  app.get("/landmarks", async (request, reply) => {
    const landmarks = await prisma.landmark.findMany({
      include: {
        locality: {
          select: { name: true, slug: true }
        }
      },
      orderBy: { name: "asc" }
    });

    const formatted = landmarks.map((lm) => ({
      id: lm.id,
      name: lm.name,
      slug: lm.slug,
      latitude: lm.latitude,
      longitude: lm.longitude,
      locality: lm.locality.name,
      localitySlug: lm.locality.slug
    }));

    const response: ApiResponse<typeof formatted> = {
      success: true,
      data: formatted,
      error: null,
      meta: { timestamp: new Date().toISOString(), requestId: request.id }
    };
    return reply.status(200).send(response);
  });

  // Standard PG Amenities
  app.get("/amenities", async (request, reply) => {
    const amenities = await prisma.amenity.findMany({
      orderBy: { name: "asc" }
    });

    const response: ApiResponse<typeof amenities> = {
      success: true,
      data: amenities,
      error: null,
      meta: { timestamp: new Date().toISOString(), requestId: request.id }
    };
    return reply.status(200).send(response);
  });
}
