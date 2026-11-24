import { LatLng } from "./commute.types.js";

export type BuddyVerificationTier = "NONE" | "PHONE" | "ID_VERIFIED";

export interface BuddyProfile {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  bio: string;
  languages: string[];
  serviceLocalities: string[];
  serviceAreaCenter: LatLng;
  serviceRadiusKm: number;
  hourlyFee: number;
  isDeclaredNotBroker: boolean;
  verificationTier: BuddyVerificationTier;
  rating: number;
  totalReviews: number;
  avgResponseMinutes: number;
  availableDays: string[]; // ["MON", "TUE", ...]
  createdAt: string;
}

export type HelpRequestStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED";

export type HelpRequestChannel = "TEXT" | "PHONE" | "VIDEO" | "IN_PERSON";

export interface HelpRequest {
  id: string;
  seekerId: string;
  seekerName: string;
  buddyId: string;
  buddyName: string;
  status: HelpRequestStatus;
  preferredChannel: HelpRequestChannel;
  targetLocalities: string[];
  maxBudget: number;
  note: string;
  agreedFee: number;
  seekerSharedPhone: boolean;
  buddySharedPhone: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuddyReview {
  id: string;
  helpRequestId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  tags: string[]; // ["knew the area", "honest", "punctual"]
  comment: string;
  createdAt: string;
}
