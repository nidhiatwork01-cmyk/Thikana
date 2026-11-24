import jwt from "jsonwebtoken";
import { env } from "../config/index.js";
import { redis } from "./redis.js";
import { UnauthorizedError } from "../errors/index.js";
import { UserRole } from "@thikana/shared-types";

export interface TokenPayload {
  userId: string;
  email: string;
  roles: UserRole[];
  tokenVersion?: number;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m"
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d"
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
}

// Stores refresh token family in Redis for one-time rotation and instant revocation
export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const key = `refresh_token:${userId}`;
  // Store with 7-day TTL
  await redis.set(key, token, "EX", 7 * 24 * 60 * 60);
}

export async function validateStoredRefreshToken(userId: string, token: string): Promise<boolean> {
  const key = `refresh_token:${userId}`;
  const stored = await redis.get(key);
  return stored === token;
}

export async function revokeRefreshToken(userId: string): Promise<void> {
  const key = `refresh_token:${userId}`;
  await redis.del(key);
}
