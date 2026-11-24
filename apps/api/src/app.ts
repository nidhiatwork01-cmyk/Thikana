import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";
import { env } from "./config/index.js";
import { APP_CONFIG, ApiResponse } from "@thikana/shared-types";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { listingsRoutes } from "./modules/listings/listings.routes.js";
import { metaRoutes } from "./modules/meta/meta.routes.js";
import { commuteRoutes } from "./modules/commute/commute.routes.js";
import { huntRoutes } from "./modules/hunt/hunt.routes.js";
import { buddyRoutes } from "./modules/buddies/buddy.routes.js";
import { chatRoutes } from "./modules/chat/chat.routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname"
              }
            }
          : undefined
    }
  });

  // Central Error Handler (Consistent Envelope + Zod + AppErrors)
  app.setErrorHandler(errorHandler);

  // Security Headers
  app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === "production"
  });

  // CORS
  app.register(cors, {
    origin: [env.CORS_ORIGIN, "http://localhost:5173"],
    credentials: true
  });

  // Cookie Support for httpOnly Rotating Refresh Tokens
  app.register(cookie, {
    secret: env.JWT_REFRESH_SECRET,
    hook: "onRequest"
  });

  // OpenAPI / Swagger Documentation
  app.register(swagger, {
    openapi: {
      info: {
        title: `${APP_CONFIG.name} REST API`,
        description: `Production API documentation for ${APP_CONFIG.name} (${APP_CONFIG.city} Relocation & PG Platform)`,
        version: "1.0.0"
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: "Local development server"
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
    }
  });

  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    }
  });

  // System Probes
  app.get("/api/v1/health", async (_req, reply) => {
    const response: ApiResponse<{
      app: string;
      status: string;
      city: string;
      version: string;
      uptime: number;
    }> = {
      success: true,
      data: {
        app: APP_CONFIG.name,
        status: "ok",
        city: APP_CONFIG.city,
        version: "1.0.0",
        uptime: process.uptime()
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: _req.id
      }
    };
    return reply.status(200).send(response);
  });

  app.get("/api/v1/ready", async (_req, reply) => {
    return reply.status(200).send({
      success: true,
      data: { ready: true },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: _req.id
      }
    });
  });

  // Register API Domain Modules under /api/v1
  app.register(websocket, {
    options: { maxPayload: 1048576 }
  });

  app.register(authRoutes, { prefix: "/api/v1/auth" });
  app.register(listingsRoutes, { prefix: "/api/v1/pgs" });
  app.register(metaRoutes, { prefix: "/api/v1/meta" });
  app.register(commuteRoutes, { prefix: "/api/v1/commute" });
  app.register(huntRoutes, { prefix: "/api/v1/hunt" });
  app.register(buddyRoutes, { prefix: "/api/v1/buddies" });
  app.register(chatRoutes, { prefix: "/api/v1/chat" });

  // Root Info Route
  app.get("/", async (_req, reply) => {
    return reply.send({
      name: APP_CONFIG.name,
      tagline: APP_CONFIG.tagline,
      city: APP_CONFIG.city,
      docs: "/docs",
      health: "/api/v1/health"
    });
  });

  return app;
}
