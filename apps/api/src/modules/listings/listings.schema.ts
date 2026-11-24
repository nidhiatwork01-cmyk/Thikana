import { z } from "zod";
import { GenderType, FoodType, FurnishedStatus, SharingType } from "@prisma/client";

export const pgFilterQuerySchema = z.object({
  locality: z.string().optional(),
  gender: z.nativeEnum(GenderType).optional(),
  foodType: z.nativeEnum(FoodType).optional(),
  minRent: z.coerce.number().min(0).optional(),
  maxRent: z.coerce.number().min(0).optional(),
  sharingType: z.nativeEnum(SharingType).optional(),
  furnishedStatus: z.nativeEnum(FurnishedStatus).optional(),
  amenities: z.union([z.string(), z.array(z.string())]).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sort: z.enum(["price_asc", "price_desc", "newest", "rating"]).default("newest"),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(12)
});

export const createPgSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  address: z.string().min(10, "Address is required"),
  localityId: z.string().uuid("Valid locality ID required"),
  latitude: z.number().min(17.0).max(18.0, "Latitude must be within Hyderabad region"),
  longitude: z.number().min(78.0).max(79.0, "Longitude must be within Hyderabad region"),
  minRent: z.number().positive("Minimum rent must be positive"),
  depositAmount: z.number().min(0),
  maintenanceFee: z.number().min(0).default(0),
  gender: z.nativeEnum(GenderType),
  foodType: z.nativeEnum(FoodType).default(FoodType.BOTH),
  isFoodIncluded: z.boolean().default(true),
  furnishedStatus: z.nativeEnum(FurnishedStatus).default(FurnishedStatus.FULLY_FURNISHED),
  curfewTime: z.string().default("None"),
  rulesNoticePeriod: z.string().default("30 Days"),
  contactPhone: z.string().regex(/^\+91[6-9]\d{9}$/, "Valid Indian phone number required"),
  amenityIds: z.array(z.string()).default([]),
  rooms: z.array(
    z.object({
      sharingType: z.nativeEnum(SharingType),
      rentPerMonth: z.number().positive(),
      totalBeds: z.number().int().positive(),
      availableBeds: z.number().int().min(0)
    })
  ).min(1, "At least one room option is required"),
  imageUrls: z.array(z.string().url()).min(1, "At least one room image is required")
});

export const updatePgSchema = createPgSchema.partial();

export type PgFilterQuery = z.infer<typeof pgFilterQuerySchema>;
export type CreatePgInput = z.infer<typeof createPgSchema>;
export type UpdatePgInput = z.infer<typeof updatePgSchema>;
