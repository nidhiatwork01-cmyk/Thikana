import { z } from "zod";

// Hyderabad metro area spans roughly lat 17.0–18.0, lng 78.0–79.0.
// Reject coordinates outside this box early to avoid wasted isochrone API calls.

export const commuteZoneSchema = z.object({
  destination: z.object({
    lat: z.number().min(17.0).max(18.0, "Latitude must be within Hyderabad region"),
    lng: z.number().min(78.0).max(79.0, "Longitude must be within Hyderabad region"),
  }),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be 24h format HH:MM"),
  travelMode: z.enum(["bike", "car", "transit"]),
  maxMinutes: z.number().int().min(5).max(90).default(30),
});

export const commuteSearchSchema = z.object({
  destLat: z.coerce.number().min(17.0).max(18.0, "Latitude must be within Hyderabad region"),
  destLng: z.coerce.number().min(78.0).max(79.0, "Longitude must be within Hyderabad region"),
  arrivalTime: z.string().default("09:30"),
  travelMode: z.enum(["bike", "car", "transit"]).default("bike"),
  maxMinutes: z.coerce.number().int().min(5).max(90).default(30),
  gender: z.enum(["MEN", "WOMEN", "CO_LIVING"]).optional(),
  maxBudget: z.coerce.number().optional(),
  sharingType: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "FOUR_PLUS"]).optional(),
  foodType: z.enum(["VEG", "NON_VEG", "BOTH", "NONE"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(["commute", "price", "newest", "rating"]).default("commute").optional(),
});

export const commuteJobStatusSchema = z.object({
  jobId: z.string().min(1, "Valid job ID required"),
});

export type CommuteZoneInput = z.infer<typeof commuteZoneSchema>;
export type CommuteSearchInput = z.infer<typeof commuteSearchSchema>;
export type CommuteJobStatusInput = z.infer<typeof commuteJobStatusSchema>;
