import { z } from "zod";

export const onSiteChecklistSchema = z.object({
  waterPressure: z.number().min(1).max(5).default(3),
  waterSmellClean: z.boolean().default(true),
  ventilationSunlight: z.number().min(1).max(5).default(3),
  trafficNoiseLevel: z.number().min(1).max(5).default(3),
  wifiSpeedMbps: z.number().optional(),
  foodTasteRating: z.number().min(1).max(5).optional(),
  safetyCctvPresent: z.boolean().default(false),
  curfewTime: z.string().optional(),
  visitorPolicy: z
    .enum(["ANYTIME", "DAY_ONLY", "NO_OPPOSITE_GENDER", "STRICTLY_NONE"])
    .default("DAY_ONLY"),
  noticePeriodDays: z.number().default(30),
  lockInMonths: z.number().default(0),
  notes: z.string().default(""),
  photos: z.array(z.string()).default([]),
});

export const huntScoringWeightsSchema = z.object({
  commute: z.number().min(0).max(1).default(0.25),
  price: z.number().min(0).max(1).default(0.25),
  food: z.number().min(0).max(1).default(0.15),
  cleanliness: z.number().min(0).max(1).default(0.15),
  safety: z.number().min(0).max(1).default(0.1),
  vibe: z.number().min(0).max(1).default(0.1),
});

export const createHuntItemSchema = z.object({
  pgListingId: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(3, "Address is required"),
  location: z.object({
    lat: z.number().min(17.0).max(18.0),
    lng: z.number().min(78.0).max(79.0),
  }),
  rent: z.number().min(1000, "Rent must be at least 1000"),
  phone: z.string().optional(),
  sourceUrl: z.string().optional(),
  checklist: onSiteChecklistSchema.optional(),
});

export const updateHuntItemSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  rent: z.number().optional(),
  phone: z.string().optional(),
  sourceUrl: z.string().optional(),
  checklist: onSiteChecklistSchema.optional(),
  status: z
    .enum(["SAVED", "VISIT_PLANNED", "VISITED", "OFFER_MADE", "REJECTED"])
    .optional(),
  visitOrder: z.number().int().optional(),
});

export const visitPlanRequestSchema = z.object({
  startLocation: z.object({
    lat: z.number().min(17.0).max(18.0),
    lng: z.number().min(78.0).max(79.0),
  }),
  huntItemIds: z.array(z.string()).min(1, "At least 1 PG required for planning"),
  dayStartTime: z.string().regex(/^\d{2}:\d{2}$/).default("10:00"),
  minutesPerVisit: z.number().int().min(15).max(120).default(45),
});

export type CreateHuntItemInput = z.infer<typeof createHuntItemSchema>;
export type UpdateHuntItemInput = z.infer<typeof updateHuntItemSchema>;
export type VisitPlanRequestInput = z.infer<typeof visitPlanRequestSchema>;
export type HuntScoringWeightsInput = z.infer<typeof huntScoringWeightsSchema>;
