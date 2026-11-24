import { z } from "zod";

export const sendMessageSchema = z.object({
  text: z.string().min(1, "Message text cannot be empty").max(2000, "Message text too long"),
  mediaUrls: z.array(z.string().url("Invalid media URL")).optional().default([]),
  tempId: z.string().optional()
});

export const markReadSchema = z.object({
  messageId: z.string().uuid("Invalid message UUID").optional()
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
