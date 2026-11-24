import { FastifyInstance } from "fastify";
import {
  commuteZoneSchema,
  commuteSearchSchema,
  commuteJobStatusSchema,
} from "./commute.schema.js";
import { commuteService } from "./commute.service.js";
import { addCommuteJob, commuteQueue } from "../../jobs/index.js";
import { NotFoundError } from "../../errors/index.js";
import type { ApiResponse, IsochroneResponse } from "@thikana/shared-types";

/**
 * Commute Engine Routes
 *
 * Exposes:
 * - POST /zones: Synchronous isochrone calculation (returns GeoJSON polygon)
 * - GET /search: Find PG listings that fall within the isochrone polygon with live commute times
 * - POST /zones/async: Enqueues a background computation job in BullMQ (HTTP 202 Accepted)
 * - GET /jobs/:jobId: Polling endpoint for background commute job status and results
 */

export async function commuteRoutes(app: FastifyInstance) {
  // Synchronous Isochrone Generation
  app.post("/zones", async (request, reply) => {
    const input = commuteZoneSchema.parse(request.body);
    const isochrone = await commuteService.getIsochrone(input);

    const response: ApiResponse<IsochroneResponse> = {
      success: true,
      data: isochrone,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });

  // Commute-First Search (Polygon Filter + PG Enrichment + Sorting)
  app.get("/search", async (request, reply) => {
    const query = commuteSearchSchema.parse(request.query);

    const result = await commuteService.searchPGsInZone({
      destination: {
        lat: query.destLat,
        lng: query.destLng,
      },
      arrivalTime: query.arrivalTime,
      travelMode: query.travelMode,
      maxMinutes: query.maxMinutes,
      gender: query.gender,
      maxBudget: query.maxBudget,
      sharingType: query.sharingType,
      foodType: query.foodType,
      sortBy: query.sortBy,
      cursor: query.cursor,
      limit: query.limit,
    });

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

  // Background Job Submission for Heavy Travel Time Matrix Computations
  // Why 202 Accepted: Processing can take several seconds; client gets a jobId to poll or subscribe via WS
  app.post("/zones/async", async (request, reply) => {
    const input = commuteZoneSchema.parse(request.body);
    const job = await addCommuteJob({
      destination: input.destination,
      arrivalTime: input.arrivalTime,
      travelMode: input.travelMode,
      maxMinutes: input.maxMinutes,
    });

    const response: ApiResponse<{ jobId: string; status: string }> = {
      success: true,
      data: {
        jobId: job.id ?? "pending",
        status: "queued",
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(202).send(response);
  });

  // Job Status Polling
  app.get("/jobs/:jobId", async (request, reply) => {
    const { jobId } = commuteJobStatusSchema.parse(request.params);
    const job = await commuteQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundError(`Commute computation job ${jobId} not found`);
    }

    const state = await job.getState();
    const isCompleted = state === "completed";
    const isFailed = state === "failed";

    const response: ApiResponse<{
      id: string;
      state: string;
      result: any;
      failedReason?: string;
    }> = {
      success: true,
      data: {
        id: job.id ?? jobId,
        state,
        result: isCompleted ? job.returnvalue : null,
        failedReason: isFailed ? job.failedReason : undefined,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    };
    return reply.status(200).send(response);
  });
}
