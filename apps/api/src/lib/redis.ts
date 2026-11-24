import { Redis } from "ioredis";
import { env } from "../config/index.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 100, 3000); // Exponential backoff up to 3s
  }
});

redis.on("error", (err) => {
  console.error("⚠️ Redis connection error:", err.message);
});
