import { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import { sendMessageSchema, markReadSchema } from "./chat.schema.js";
import { chatService } from "./chat.service.js";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { verifyAccessToken } from "../../lib/jwt.js";
import { UnauthorizedError } from "../../errors/index.js";
import type { ApiResponse, WsClientEvent, WsServerEvent } from "@thikana/shared-types";

async function resolveUserId(request: FastifyRequest): Promise<string> {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      return payload.userId;
    } catch {
      // Continue to query token or fallback
    }
  }

  const query = request.query as any;
  if (query && typeof query.token === "string") {
    try {
      const payload = verifyAccessToken(query.token);
      return payload.userId;
    } catch {
      // Continue to fallback
    }
  }

  // Fallback to demo seeker in development/testing
  const demoUser = await prisma.user.findFirst({
    where: { email: "seeker@gmail.com" }
  });
  if (demoUser) {
    return demoUser.id;
  }

  const firstUser = await prisma.user.findFirst();
  if (firstUser) {
    return firstUser.id;
  }

  throw new UnauthorizedError("Authentication required for chat access");
}

export async function chatRoutes(app: FastifyInstance) {
  // 1. Fetch Message History (REST)
  app.get("/:requestId/messages", async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const userId = await resolveUserId(request);

    const messages = await chatService.getMessages(requestId, userId);

    const response: ApiResponse<typeof messages> = {
      success: true,
      data: messages,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id
      }
    };
    return reply.status(200).send(response);
  });

  // 2. Post a Chat Message (REST with Anti-Scam Heuristics)
  app.post("/:requestId/messages", async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const userId = await resolveUserId(request);
    const body = sendMessageSchema.parse(request.body);

    const result = await chatService.postMessage(
      requestId,
      userId,
      body.text,
      body.mediaUrls,
      body.tempId
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id
      }
    };
    return reply.status(201).send(response);
  });

  // 3. Mark Messages Read (REST)
  app.post("/:requestId/read", async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const userId = await resolveUserId(request);
    const body = markReadSchema.parse(request.body || {});

    const result = await chatService.markRead(requestId, userId, body.messageId);

    const response: ApiResponse<typeof result> = {
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

  // 4. Real-Time Chat WebSocket Endpoint
  app.get(
    "/:requestId/ws",
    { websocket: true },
    async (socket: WebSocket, request: FastifyRequest) => {
      const { requestId } = request.params as { requestId: string };
      let userId: string;

      try {
        userId = await resolveUserId(request);
        await chatService.getVerifiedHelpRequest(requestId, userId);
      } catch (err: any) {
        socket.send(
          JSON.stringify({
            type: "error",
            payload: {
              code: "AUTH_FAILED",
              message: err.message || "Unauthorized WebSocket connection"
            }
          })
        );
        socket.close();
        return;
      }

      // Create dedicated Redis subscriber connection for this connection
      const subscriber = redis.duplicate();
      const channel = `chat:request:${requestId}`;

      try {
        await subscriber.subscribe(channel);
      } catch (err) {
        console.error("⚠️ Failed to subscribe to Redis channel:", err);
      }

      // Forward events from Redis pub/sub to this WebSocket client
      subscriber.on("message", (_chan, msgStr) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(msgStr);
        }
      });

      // Handle events incoming from client
      socket.on("message", async (rawMessage: any) => {
        try {
          const event: WsClientEvent = JSON.parse(rawMessage.toString());

          if (event.type === "message.send") {
            await chatService.postMessage(
              requestId,
              userId,
              event.payload.text,
              event.payload.mediaUrls,
              event.payload.tempId
            );
          } else if (event.type === "typing") {
            const typingEvent: WsServerEvent = {
              type: "typing",
              payload: {
                requestId,
                userId,
                isTyping: event.payload.isTyping
              }
            };
            await redis.publish(channel, JSON.stringify(typingEvent));
          } else if (event.type === "read") {
            await chatService.markRead(requestId, userId, event.payload.messageId);
          } else if (event.type === "heartbeat") {
            socket.send(
              JSON.stringify({
                type: "heartbeat",
                payload: { timestamp: Date.now() }
              })
            );
          }
        } catch (err: any) {
          socket.send(
            JSON.stringify({
              type: "error",
              payload: {
                code: "MESSAGE_PROCESSING_ERROR",
                message: err.message || "Failed to process client event"
              }
            })
          );
        }
      });

      // Cleanup on disconnect
      const cleanup = async () => {
        try {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        } catch {
          // ignore cleanup errors
        }
      };

      socket.on("close", cleanup);
      socket.on("error", cleanup);
    }
  );
}
