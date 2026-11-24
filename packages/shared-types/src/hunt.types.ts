import { LatLng } from "./commute.types.js";

export interface OnSiteChecklist {
  waterPressure: number; // 1-5
  waterSmellClean: boolean;
  ventilationSunlight: number; // 1-5
  trafficNoiseLevel: number; // 1-5 (1=loud, 5=peaceful)
  wifiSpeedMbps?: number;
  foodTasteRating?: number; // 1-5
  safetyCctvPresent: boolean;
  curfewTime?: string; // e.g. "10:30 PM"
  visitorPolicy: "ANYTIME" | "DAY_ONLY" | "NO_OPPOSITE_GENDER" | "STRICTLY_NONE";
  noticePeriodDays: number; // e.g. 30
  lockInMonths: number; // e.g. 0, 3, 6
  notes: string;
  photos: string[];
}

export interface HuntScoringWeights {
  commute: number; // 0 to 1
  price: number;
  food: number;
  cleanliness: number;
  safety: number;
  vibe: number;
}

export interface HuntItem {
  id: string;
  userId: string;
  pgListingId?: string | null;
  name: string;
  location: LatLng;
  address: string;
  rent: number;
  phone?: string;
  sourceUrl?: string; // e.g. Google Maps or WhatsApp broker link
  checklist: OnSiteChecklist;
  calculatedScore?: number; // 0-100
  scoreBreakdown?: Record<string, number>;
  status: "SAVED" | "VISIT_PLANNED" | "VISITED" | "OFFER_MADE" | "REJECTED";
  visitOrder?: number;
  updatedAt: string;
}

export interface VisitPlanRequest {
  startLocation: LatLng;
  huntItemIds: string[];
  dayStartTime: string; // "10:00"
  minutesPerVisit: number; // default 45 min
}

export interface VisitRouteLeg {
  fromName: string;
  toName: string;
  fromLocation: LatLng;
  toLocation: LatLng;
  distanceKm: number;
  travelMinutes: number;
  googleMapsUrl: string;
}

export interface VisitPlanResult {
  orderedItems: HuntItem[];
  timeline: Array<{
    huntItemId: string;
    name: string;
    arrivalTime: string;
    departureTime: string;
  }>;
  legs: VisitRouteLeg[];
  totalDistanceKm: number;
  totalTimeMinutes: number;
}
