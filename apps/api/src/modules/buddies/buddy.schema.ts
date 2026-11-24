import { z } from "zod";

export const listBuddiesQuerySchema = z.object({
  locality: z.string().optional(),
  language: z.string().optional(),
  maxFee: z.coerce.number().optional(),
  availableDay: z.string().optional(),
  verificationTier: z.enum(["NONE", "PHONE", "ID_VERIFIED"]).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const createHelpRequestSchema = z.object({
  buddyId: z.string().uuid("Valid buddy profile ID required"),
  channel: z.enum(["TEXT", "PHONE", "VIDEO", "IN_PERSON"]).default("TEXT"),
  targetLocalities: z.array(z.string()).min(1, "At least one target locality is required"),
  maxBudget: z.number().min(3000, "Budget must be at least ₹3,000"),
  note: z.string().min(10, "Please describe what help you need (at least 10 characters)"),
  agreedFee: z.number().min(100).max(1000).default(150),
});

export const updateHelpRequestStatusSchema = z.object({
  status: z.enum([
    "REQUESTED",
    "ACCEPTED",
    "IN_PROGRESS",
    "COMPLETED",
    "DECLINED",
    "CANCELLED",
  ]),
});

export const sharePhoneConsentSchema = z.object({
  share: z.boolean(),
});

export const createBuddyReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string()).default([]),
  comment: z.string().min(5, "Comment must be at least 5 characters"),
});

export type ListBuddiesQuery = z.infer<typeof listBuddiesQuerySchema>;
export type CreateHelpRequestInput = z.infer<typeof createHelpRequestSchema>;
export type UpdateHelpRequestStatusInput = z.infer<typeof updateHelpRequestStatusSchema>;
export type SharePhoneConsentInput = z.infer<typeof sharePhoneConsentSchema>;
export type CreateBuddyReviewInput = z.infer<typeof createBuddyReviewSchema>;
