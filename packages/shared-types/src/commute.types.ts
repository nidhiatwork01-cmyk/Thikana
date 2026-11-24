export type TravelMode = "bike" | "car" | "transit";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface IsochroneRequest {
  destination: LatLng;
  arrivalTime: string; // e.g. "09:30" (24h format)
  travelMode: TravelMode;
  maxMinutes: number; // 10 to 90
}

export interface GeoJsonPolygon {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface IsochroneFeature {
  type: "Feature";
  properties: {
    value: number; // minutes
    mode: TravelMode;
    arrivalTime: string;
    isCongested: boolean;
    congestionFactor: number;
  };
  geometry: GeoJsonPolygon;
}

export interface IsochroneResponse {
  type: "FeatureCollection";
  features: IsochroneFeature[];
  metadata: {
    provider: "openrouteservice" | "hyderabad-calibrated-model";
    isEstimated: boolean;
    cached: boolean;
    queryTimeMs: number;
  };
}

export interface CommutePGListing {
  id: string;
  title: string;
  slug: string;
  address: string;
  location: LatLng;
  minRent: number;
  depositAmount: number;
  gender: "MEN" | "WOMEN" | "CO_LIVING";
  sharingTypes: Array<"SINGLE" | "DOUBLE" | "TRIPLE" | "FOUR_PLUS">;
  foodType: "VEG" | "NON_VEG" | "BOTH" | "NONE";
  isFoodIncluded: boolean;
  amenities: string[];
  coverImageUrl?: string;
  images: string[];
  isVerified: boolean;
  estimatedCommuteMinutes: number;
  distanceKm: number;
}
