import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../errors/index.js";
import { analyzeMessageForScam, ScamAnalysisResult } from "./scam-detector.js";
import { WsServerEvent } from "@thikana/shared-types";

export interface FormattedChatMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  text: string;
  mediaUrls: string[];
  isFlaggedScam: boolean;
  readAt: string | null;
  createdAt: string;
  tempId?: string;
}

export class ChatService {
  /**
   * Helper to verify participant access and retrieve request
   */
  async getVerifiedHelpRequest(requestId: string, userId: string) {
    const request = await prisma.helpRequest.findUnique({
      where: { id: requestId },
      include: {
        seeker: { select: { id: true, fullName: true, phone: true } },
        buddy: {
          include: {
            user: { select: { id: true, fullName: true, phone: true } }
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundError("Help request not found");
    }

    const isSeeker = request.seekerId === userId;
    const isBuddy = request.buddy.userId === userId;

    if (!isSeeker && !isBuddy) {
      throw new ForbiddenError("You are not an authorized participant in this conversation");
    }

    return { request, isSeeker, isBuddy };
  }

  /**
   * List message history for a help request
   */
  async getMessages(requestId: string, userId: string): Promise<FormattedChatMessage[]> {
    await this.getVerifiedHelpRequest(requestId, userId);

    const messages = await prisma.chatMessage.findMany({
      where: { helpRequestId: requestId },
      include: {
        sender: {
          select: { id: true, fullName: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return messages.map((m) => ({
      id: m.id,
      requestId: m.helpRequestId,
      senderId: m.senderId,
      senderName: m.sender.fullName,
      text: m.messageText,
      mediaUrls: m.mediaUrls,
      isFlaggedScam: m.isFlaggedScam,
      readAt: m.readAt ? m.readAt.toISOString() : null,
      createdAt: m.createdAt.toISOString()
    }));
  }

  /**
   * Post a new message with Anti-Scam heuristics and real-time Redis broadcasting
   */
  async postMessage(
    requestId: string,
    senderId: string,
    text: string,
    mediaUrls: string[] = [],
    tempId?: string
  ): Promise<{ message: FormattedChatMessage; scamAnalysis: ScamAnalysisResult }> {
    const { request } = await this.getVerifiedHelpRequest(requestId, senderId);

    // Enforce active session
    if (
      request.status === "DECLINED" ||
      request.status === "CANCELLED" ||
      request.status === "EXPIRED"
    ) {
      throw new BadRequestError(`Cannot send messages in ${request.status} status`);
    }

    // Run Anti-Scam Heuristics
    const scamAnalysis = analyzeMessageForScam(text);

    const message = await prisma.chatMessage.create({
      data: {
        helpRequestId: requestId,
        senderId,
        messageText: text,
        mediaUrls,
        isFlaggedScam: scamAnalysis.isScam
      },
      include: {
        sender: {
          select: { id: true, fullName: true }
        }
      }
    });

    const formattedMessage: FormattedChatMessage = {
      id: message.id,
      requestId: message.helpRequestId,
      senderId: message.senderId,
      senderName: message.sender.fullName,
      text: message.messageText,
      mediaUrls: message.mediaUrls,
      isFlaggedScam: message.isFlaggedScam,
      readAt: null,
      createdAt: message.createdAt.toISOString(),
      tempId
    };

    // Broadcast over Redis Pub/Sub channel for multi-instance WebSocket nodes
    try {
      const serverEvent: WsServerEvent = {
        type: "message.new",
        payload: {
          id: message.id,
          requestId: message.helpRequestId,
          senderId: message.senderId,
          text: message.messageText,
          mediaUrls: message.mediaUrls,
          isFlaggedScam: message.isFlaggedScam,
          createdAt: message.createdAt.toISOString(),
          tempId
        }
      };

      await redis.publish(`chat:request:${requestId}`, JSON.stringify(serverEvent));
    } catch (err) {
      // Non-blocking error logging for Redis pub/sub failure
      console.error("⚠️ Failed to broadcast chat event to Redis:", err);
    }

    return {
      message: formattedMessage,
      scamAnalysis
    };
  }

  /**
   * Mark messages as read by recipient
   */
  async markRead(requestId: string, userId: string, messageId?: string): Promise<{ count: number }> {
    await this.getVerifiedHelpRequest(requestId, userId);

    const where: any = {
      helpRequestId: requestId,
      senderId: { not: userId },
      readAt: null
    };

    if (messageId) {
      where.id = messageId;
    }

    const result = await prisma.chatMessage.updateMany({
      where,
      data: { readAt: new Date() }
    });

    if (result.count > 0) {
      try {
        const readEvent: WsServerEvent = {
          type: "read",
          payload: {
            requestId,
            userId,
            messageId: messageId || "all"
          }
        };
        await redis.publish(`chat:request:${requestId}`, JSON.stringify(readEvent));
      } catch (err) {
        console.error("⚠️ Failed to publish read receipt:", err);
      }
    }

    return { count: result.count };
  }
}

export const chatService = new ChatService();
