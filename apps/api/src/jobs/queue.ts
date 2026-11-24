import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/index.js";
import { commuteService } from "../modules/commute/commute.service.js";
import type { LatLng, TravelMode, IsochroneResponse, CommutePGListing } from "@thikana/shared-types";

/**
 * BullMQ Queue & Worker for heavy commute computations
 *
 * Why BullMQ?
 * Computing multi-modal travel isochrones, reverse geocoding, and routing matrices
 * across 40+ PG listings is CPU and I/O intensive. A background queue prevents Fastify
 * event loop starvation and provides rate-limited queueing with job retries and telemetry.
 *
 * Why separate Redis connections?
 * BullMQ workers use blocking commands (BRPOPLPUSH/BLMOVE) that monopolize their Redis connection.
 * Sharing the application Redis client with BullMQ would cause application commands to stall.
 */

export interface CommuteJobData {
  destination: LatLng;
  arrivalTime: string;
  travelMode: TravelMode;
  maxMinutes: number;
  requestedBy?: string;
}

export interface CommuteJobResult {
  isochrone: IsochroneResponse;
  pgsInZone: CommutePGListing[];
  provider: string;
  cached: boolean;
}

const queueRedisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const workerRedisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const commuteQueue = new Queue<CommuteJobData, CommuteJobResult>("commute-jobs", {
  connection: queueRedisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // keep completed jobs for 1 hour
      count: 500,
    },
    removeOnFail: {
      age: 86400, // keep failed jobs for 24 hours
      count: 200,
    },
  },
});

export const commuteWorker = new Worker<CommuteJobData, CommuteJobResult>(
  "commute-jobs",
  async (job: Job<CommuteJobData, CommuteJobResult>) => {
    return await commuteService.computeZoneWithPGs(job.data);
  },
  {
    connection: workerRedisConnection,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60000, // Max 10 computations per minute to respect external API boundaries
    },
  }
);

commuteWorker.on("completed", (job) => {
  console.log(`[Job Worker] Job ${job.id} completed successfully`);
});

commuteWorker.on("failed", (job, err) => {
  console.error(`[Job Worker] Job ${job?.id} failed with error:`, err.message);
});

commuteWorker.on("error", (err) => {
  console.error("[Job Worker] Worker error:", err.message);
});

export async function addCommuteJob(data: CommuteJobData): Promise<Job<CommuteJobData, CommuteJobResult>> {
  return await commuteQueue.add("calculate-commute-zone", data);
}

export async function closeQueues(): Promise<void> {
  await commuteWorker.close();
  await commuteQueue.close();
  queueRedisConnection.disconnect();
  workerRedisConnection.disconnect();
}
