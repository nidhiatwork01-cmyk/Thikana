import type {
  ApiResponse,
  IsochroneRequest,
  IsochroneResponse,
  CommutePGListing,
} from "@thikana/shared-types";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") || "/api/v1";

export interface CommuteSearchParams {
  destLat: number;
  destLng: number;
  arrivalTime: string;
  travelMode: "bike" | "car" | "transit";
  maxMinutes: number;
  gender?: "MEN" | "WOMEN" | "CO_LIVING";
  maxBudget?: number;
  sharingType?: "SINGLE" | "DOUBLE" | "TRIPLE" | "FOUR_PLUS";
  foodType?: "VEG" | "NON_VEG" | "BOTH" | "NONE";
  sortBy?: "commute" | "price" | "newest" | "rating";
  limit?: number;
}

export interface CommuteSearchResultData {
  isochrone: IsochroneResponse;
  pgs: CommutePGListing[];
  hasMore: boolean;
  nextCursor: string | null;
  total: number;
}

export async function fetchIsochroneZone(
  request: IsochroneRequest
): Promise<IsochroneResponse> {
  const res = await fetch(`${API_BASE}/commute/zones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || "Failed to calculate commute zone");
  }

  const json: ApiResponse<IsochroneResponse> = await res.json();
  if (!json.data) throw new Error("No isochrone data returned");
  return json.data;
}

export async function searchPGsInCommuteZone(
  params: CommuteSearchParams
): Promise<CommuteSearchResultData> {
  const query = new URLSearchParams({
    destLat: params.destLat.toString(),
    destLng: params.destLng.toString(),
    arrivalTime: params.arrivalTime,
    travelMode: params.travelMode,
    maxMinutes: params.maxMinutes.toString(),
    limit: (params.limit || 30).toString(),
  });

  if (params.gender) query.set("gender", params.gender);
  if (params.maxBudget) query.set("maxBudget", params.maxBudget.toString());
  if (params.sharingType) query.set("sharingType", params.sharingType);
  if (params.foodType) query.set("foodType", params.foodType);
  if (params.sortBy) query.set("sortBy", params.sortBy);

  const res = await fetch(`${API_BASE}/commute/search?${query.toString()}`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || "Failed to search listings in zone");
  }

  const json: ApiResponse<CommuteSearchResultData> = await res.json();
  if (!json.data) throw new Error("No listings data returned");
  return json.data;
}

export async function fetchLocalities(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/meta/localities`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchLandmarks(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/meta/landmarks`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export interface PGDetailData {
  id: string;
  title: string;
  slug: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  minRent: number;
  depositAmount: number;
  maintenanceFee: number;
  gender: "MEN" | "WOMEN" | "CO_LIVING";
  foodType: "VEG" | "NON_VEG" | "BOTH" | "NONE";
  isFoodIncluded: boolean;
  furnishedStatus: string;
  curfewTime: string;
  rulesNoticePeriod: string;
  contactPhone: string;
  isVerified: boolean;
  locality?: {
    id: string;
    name: string;
    slug: string;
  };
  rooms: Array<{
    id: string;
    sharingType: "SINGLE" | "DOUBLE" | "TRIPLE" | "FOUR_PLUS";
    rentPerMonth: number;
    totalBeds: number;
    availableBeds: number;
  }>;
  amenities: Array<{
    amenity: {
      id: string;
      name: string;
      iconKey: string;
      category: string;
    };
  }>;
  images: Array<{
    id: string;
    url: string;
    altText: string;
    isCover: boolean;
    displayOrder: number;
  }>;
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    user?: {
      fullName: string;
    };
  }>;
}

export async function fetchPgDetails(id: string): Promise<PGDetailData> {
  const res = await fetch(`${API_BASE}/pgs/${id}`);
  if (!res.ok) {
    throw new Error("Failed to load PG details");
  }
  const json: ApiResponse<PGDetailData> = await res.json();
  if (!json.data) throw new Error("PG not found");
  return json.data;
}

// ---------------------------------------------------------------------------
// Hunt Copilot API Client
// ---------------------------------------------------------------------------

export async function fetchHuntItems(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/hunt`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function createHuntItem(input: any): Promise<any> {
  const res = await fetch(`${API_BASE}/hunt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to add PG to hunt");
  }
  const json = await res.json();
  return json.data;
}

export async function updateHuntItem(id: string, input: any): Promise<any> {
  const res = await fetch(`${API_BASE}/hunt/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to update hunt item");
  }
  const json = await res.json();
  return json.data;
}

export async function deleteHuntItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/hunt/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete hunt item");
}

export async function scoreHuntItem(id: string, weights: any): Promise<any> {
  const res = await fetch(`${API_BASE}/hunt/${id}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(weights),
  });
  if (!res.ok) throw new Error("Failed to compute score");
  const json = await res.json();
  return json.data;
}

export async function optimizeHuntRoute(input: any): Promise<any> {
  const res = await fetch(`${API_BASE}/hunt/optimize-route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to optimize route");
  }
  const json = await res.json();
  return json.data;
}


// ---------------------------------------------------------------------------
// Local Buddies API Client
// ---------------------------------------------------------------------------

export async function fetchBuddies(params?: {
  locality?: string;
  language?: string;
  maxFee?: number;
  availableDay?: string;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.locality) query.set("locality", params.locality);
  if (params?.language) query.set("language", params.language);
  if (params?.maxFee) query.set("maxFee", params.maxFee.toString());
  if (params?.availableDay) query.set("availableDay", params.availableDay);

  const res = await fetch(`${API_BASE}/buddies?${query.toString()}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchBuddyDetails(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/buddies/${id}`);
  if (!res.ok) throw new Error("Failed to load buddy details");
  const json = await res.json();
  return json.data;
}

export async function createBuddyHelpRequest(input: any): Promise<any> {
  const res = await fetch(`${API_BASE}/buddies/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to submit help request");
  }
  const json = await res.json();
  return json.data;
}

export async function fetchMyBuddyRequests(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/buddies/requests`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function updateBuddyRequestStatus(id: string, status: string): Promise<any> {
  const res = await fetch(`${API_BASE}/buddies/requests/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update request status");
  const json = await res.json();
  return json.data;
}

export async function shareBuddyPhoneConsent(id: string, share: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/buddies/requests/${id}/share-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ share }),
  });
  if (!res.ok) throw new Error("Failed to toggle phone consent");
  const json = await res.json();
  return json.data;
}

export async function submitBuddyReview(id: string, review: any): Promise<any> {
  const res = await fetch(`${API_BASE}/buddies/requests/${id}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(review),
  });
  if (!res.ok) throw new Error("Failed to submit review");
  const json = await res.json();
  return json.data;
}

// ---------------------------------------------------------------------------
// Real-Time Chat & Anti-Scam API Client (Phase 9 & 10)
// ---------------------------------------------------------------------------

export async function fetchChatMessages(requestId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/chat/${requestId}/messages`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function sendChatMessage(
  requestId: string,
  text: string,
  mediaUrls?: string[],
  tempId?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/${requestId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, mediaUrls, tempId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to send message");
  }
  const json = await res.json();
  return json.data;
}

export async function markChatRead(requestId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/${requestId}/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

