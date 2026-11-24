import { TravelTimeProvider } from "./provider.interface.js";
import {
  IsochroneRequest,
  IsochroneResponse,
  IsochroneFeature,
  LatLng,
  TravelMode
} from "@thikana/shared-types";

/**
 * Calibrated Hyderabad Peak-Hour Congestion Model
 *
 * WHY THIS EXISTS:
 * Free routing engines (ORS/OSRM) compute travel time using road-segment
 * speed limits, but they have NO live or historical traffic data. A 6 km
 * ride from Kondapur to Cyber Towers takes 12 min at midnight but 45 min
 * at 9:15 AM. This model applies corridor-specific, time-of-day
 * congestion multipliers calibrated from Hyderabad commuter experience.
 *
 * HONESTY: These are estimates. The UI shows "Estimated peak commute zone"
 * and LEARN.md explains the trade-off. It's also a great interview talking
 * point about engineering with imperfect data.
 */

// Hyderabad corridor congestion profiles
// Factor > 1 means slower than free-flow; e.g. 2.0 = twice the free-flow time
interface CongestionProfile {
  corridorName: string;
  /** Bounding box [minLng, minLat, maxLng, maxLat] */
  bbox: [number, number, number, number];
  /** Peak morning rush (8:00-10:30) multiplier */
  amPeakFactor: number;
  /** Peak evening rush (17:30-20:00) */
  pmPeakFactor: number;
  /** Shoulder hours (7:00-8:00, 10:30-12:00, 16:00-17:30) */
  shoulderFactor: number;
  /** Off-peak / weekend */
  offPeakFactor: number;
}

const HYDERABAD_CORRIDORS: CongestionProfile[] = [
  {
    corridorName: "HITEC City – Madhapur – Durgam Cheruvu",
    bbox: [78.355, 17.430, 78.400, 17.460],
    amPeakFactor: 2.2,
    pmPeakFactor: 2.4,
    shoulderFactor: 1.5,
    offPeakFactor: 1.0
  },
  {
    corridorName: "Gachibowli – Nanakramguda – Financial District",
    bbox: [78.325, 17.405, 78.370, 17.450],
    amPeakFactor: 2.0,
    pmPeakFactor: 2.3,
    shoulderFactor: 1.4,
    offPeakFactor: 1.0
  },
  {
    corridorName: "Kondapur – KPHB – Kukatpally via ORR",
    bbox: [78.340, 17.455, 78.410, 17.510],
    amPeakFactor: 1.8,
    pmPeakFactor: 2.0,
    shoulderFactor: 1.3,
    offPeakFactor: 1.0
  },
  {
    corridorName: "Ameerpet – SR Nagar – Punjagutta",
    bbox: [78.430, 17.420, 78.470, 17.450],
    amPeakFactor: 1.9,
    pmPeakFactor: 2.1,
    shoulderFactor: 1.4,
    offPeakFactor: 1.0
  },
  {
    corridorName: "Biodiversity Junction – Tolichowki – Mehdipatnam",
    bbox: [78.380, 17.385, 78.450, 17.415],
    amPeakFactor: 1.7,
    pmPeakFactor: 1.9,
    shoulderFactor: 1.3,
    offPeakFactor: 1.0
  },
  {
    corridorName: "Begumpet – Secunderabad – Uppal (NH65)",
    bbox: [78.450, 17.390, 78.570, 17.460],
    amPeakFactor: 1.6,
    pmPeakFactor: 1.8,
    shoulderFactor: 1.3,
    offPeakFactor: 1.0
  }
];

// Average free-flow speeds by mode (km/h) in Hyderabad urban context
const BASE_SPEEDS: Record<TravelMode, number> = {
  bike: 30,
  car: 35,
  transit: 18 // approximation for bus/metro including wait & walk
};

function getTimeBucket(timeStr: string): "am_peak" | "pm_peak" | "shoulder" | "off_peak" {
  const [hoursStr, minutesStr] = timeStr.split(":");
  const hours = parseInt(hoursStr || "9", 10);
  const minutes = parseInt(minutesStr || "0", 10);
  const decimal = hours + minutes / 60;

  if (decimal >= 8.0 && decimal <= 10.5) return "am_peak";
  if (decimal >= 17.5 && decimal <= 20.0) return "pm_peak";
  if (
    (decimal >= 7.0 && decimal < 8.0) ||
    (decimal > 10.5 && decimal <= 12.0) ||
    (decimal >= 16.0 && decimal < 17.5)
  ) {
    return "shoulder";
  }
  return "off_peak";
}

function getCongestionFactor(lat: number, lng: number, arrivalTime: string): number {
  const bucket = getTimeBucket(arrivalTime);

  for (const corridor of HYDERABAD_CORRIDORS) {
    const [minLng, minLat, maxLng, maxLat] = corridor.bbox;
    if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
      switch (bucket) {
        case "am_peak":
          return corridor.amPeakFactor;
        case "pm_peak":
          return corridor.pmPeakFactor;
        case "shoulder":
          return corridor.shoulderFactor;
        case "off_peak":
          return corridor.offPeakFactor;
      }
    }
  }

  // Default Hyderabad-wide factors for areas outside known corridors
  switch (bucket) {
    case "am_peak":
      return 1.5;
    case "pm_peak":
      return 1.6;
    case "shoulder":
      return 1.2;
    case "off_peak":
      return 1.0;
  }
}

/** Haversine distance in km */
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinHalf = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const aVal =
    sinHalf * sinHalf +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinHalfLng * sinHalfLng;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

/**
 * Generate an approximate isochrone polygon by sampling radii at
 * multiple compass bearings, applying congestion, and connecting
 * the resulting points into a GeoJSON polygon.
 */
function generateIsochronePolygon(
  dest: LatLng,
  maxMinutes: number,
  mode: TravelMode,
  arrivalTime: string
): IsochroneFeature {
  const baseSpeed = BASE_SPEEDS[mode];
  const congestion = getCongestionFactor(dest.lat, dest.lng, arrivalTime);
  const effectiveSpeed = baseSpeed / congestion;
  const maxDistKm = (effectiveSpeed * maxMinutes) / 60;

  const BEARINGS = 36; // sample every 10°
  const coords: [number, number][] = [];

  for (let i = 0; i < BEARINGS; i++) {
    const bearing = (i * 360) / BEARINGS;
    const bearingRad = (bearing * Math.PI) / 180;

    // Add slight organic variation (±12%) so the polygon doesn't look like a perfect circle
    const jitter = 0.88 + Math.random() * 0.24;
    const distKm = maxDistKm * jitter;

    const R = 6371;
    const lat1 = (dest.lat * Math.PI) / 180;
    const lng1 = (dest.lng * Math.PI) / 180;
    const angularDist = distKm / R;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDist) +
        Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearingRad)
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDist) * Math.cos(lat1),
        Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2)
      );

    coords.push([
      parseFloat(((lng2 * 180) / Math.PI).toFixed(6)),
      parseFloat(((lat2 * 180) / Math.PI).toFixed(6))
    ]);
  }

  // Close the ring
  coords.push(coords[0]!);

  return {
    type: "Feature",
    properties: {
      value: maxMinutes,
      mode,
      arrivalTime,
      isCongested: congestion > 1.2,
      congestionFactor: parseFloat(congestion.toFixed(2))
    },
    geometry: {
      type: "Polygon",
      coordinates: [coords]
    }
  };
}

export class HyderabadCalibratedProvider implements TravelTimeProvider {
  readonly name = "hyderabad-calibrated-model";

  async getIsochrone(request: IsochroneRequest): Promise<IsochroneResponse> {
    const start = Date.now();

    const feature = generateIsochronePolygon(
      request.destination,
      request.maxMinutes,
      request.travelMode,
      request.arrivalTime
    );

    return {
      type: "FeatureCollection",
      features: [feature],
      metadata: {
        provider: "hyderabad-calibrated-model",
        isEstimated: true,
        cached: false,
        queryTimeMs: Date.now() - start
      }
    };
  }

  async getTravelTime(
    origin: LatLng,
    destination: LatLng,
    mode: string,
    departureTime?: string
  ): Promise<number> {
    const distKm = haversineKm(origin, destination);
    const travelMode = (mode as TravelMode) || "bike";
    const baseSpeed = BASE_SPEEDS[travelMode];
    const congestion = getCongestionFactor(
      (origin.lat + destination.lat) / 2,
      (origin.lng + destination.lng) / 2,
      departureTime || "09:30"
    );
    const effectiveSpeed = baseSpeed / congestion;

    // Add a road-winding factor (1.3x for Indian urban roads vs straight-line)
    const roadFactor = 1.3;
    return Math.round((distKm * roadFactor * 60) / effectiveSpeed);
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available — it's offline
  }
}
