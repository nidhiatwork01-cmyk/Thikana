import { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError, ForbiddenError } from "../errors/index.js";
import { verifyAccessToken, TokenPayload } from "../lib/jwt.js";
import { UserRole } from "@thikana/shared-types";

declare module "fastify" {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or malformed Authorization header");
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);
  request.user = payload;
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const hasRole = request.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenError(`Action requires one of the following roles: ${allowedRoles.join(", ")}`);
    }
  };
}
