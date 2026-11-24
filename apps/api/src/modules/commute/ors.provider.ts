import type {
  IsochroneRequest,
  IsochroneResponse,
  IsochroneFeature,
  LatLng,
  TravelMode,
} from "@thikana/shared-types";
import type { TravelTimeProvider } from "./provider.interface.js";
import { env } from "../../config/index.js";

// ---------------------------------------------------------------------------
// ORS profile mapping
// ---------------------------------------------------------------------------

const ORS_PROFILES: Record<TravelMode, string> = {
  bike: "cycling-regular",
  car: "driving-car",
  // Why foot-walking? ORS has no transit profile. We approximate transit
  // reach with walking so the polygon is intentionally conservative;
  // the offline calibrated model is the preferred source for transit.
  transit: "foot-walking",
};

const ORS_BASE = "https://api.openrouteservice.org/v2";

// ---------------------------------------------------------------------------
// Circuit-breaker & rate-limiter tunables
// ---------------------------------------------------------------------------

/** Consecutive failures before the breaker opens. */
const CB_FAILURE_THRESHOLD = 5;
/** How long (ms) the breaker stays open before allowing a half-open probe. */
const CB_OPEN_DURATION_MS = 60_000;

/** Free-tier hard cap: 20 requests per rolling minute window. */
const RATE_LIMIT_PER_MINUTE = 20;

/** Per-request timeout. */
const REQUEST_TIMEOUT_MS = 5_000;

/** Retry config for transient errors (429, 503). */
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1_000;

// ---------------------------------------------------------------------------
// Circuit-breaker states
// ---------------------------------------------------------------------------

type CircuitState = "closed" | "open" | "half-open";

// ---------------------------------------------------------------------------
// OpenRouteService provider
// ---------------------------------------------------------------------------

export class OrsProvider implements TravelTimeProvider {
  readonly name = "openrouteservice";

  // -- Circuit breaker state --
  private circuitState: CircuitState = "closed";
  private consecutiveFailures = 0;
  /** Timestamp (epoch ms) when the breaker tripped open. */
  private openedAt = 0;

  // -- Rolling-window rate limiter --
  /** Timestamps (epoch ms) of recent requests within the last 60 s. */
  private requestTimestamps: number[] = [];

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async getIsochrone(request: IsochroneRequest): Promise<IsochroneResponse> {
    const start = Date.now();
    const profile = ORS_PROFILES[request.travelMode];
    const rangeSeconds = request.maxMinutes * 60;

    const body = {
      // ORS expects [lng, lat] order (GeoJSON convention)
      locations: [[request.destination.lng, request.destination.lat]],
      range: [rangeSeconds],
      range_type: "time",
    };

    const raw = await this.post<OrsIsochroneRaw>(
      `${ORS_BASE}/isochrones/${profile}`,
      body,
    );

    const features: IsochroneFeature[] = raw.features.map((f) => ({
      type: "Feature" as const,
      properties: {
        value: f.properties.value / 60, // seconds → minutes
        mode: request.travelMode,
        arrivalTime: request.arrivalTime,
        isCongested: false,
        congestionFactor: 1.0,
      },
      geometry: f.geometry,
    }));

    return {
      type: "FeatureCollection",
      features,
      metadata: {
        provider: "openrouteservice",
        isEstimated: false,
        cached: false,
        queryTimeMs: Date.now() - start,
      },
    };
  }

  async getTravelTime(
    origin: LatLng,
    destination: LatLng,
    mode: string,
    _departureTime?: string,
  ): Promise<number> {
    const travelMode = mode as TravelMode;
    const profile = ORS_PROFILES[travelMode] ?? "driving-car";

    const body = {
      locations: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      sources: [0],
      destinations: [1],
    };

    const raw = await this.post<OrsMatrixRaw>(
      `${ORS_BASE}/matrix/${profile}`,
      body,
    );

    const durationSeconds = raw.durations[0]?.[0];
    if (durationSeconds == null || durationSeconds < 0) {
      throw new OrsError("Matrix API returned no valid duration");
    }

    return Math.ceil(durationSeconds / 60); // seconds → whole minutes
  }

  async isAvailable(): Promise<boolean> {
    if (process.env.NODE_ENV === "test" && !process.env.TEST_ORS_LIVE) return false;
    if (!env.OPENROUTESERVICE_API_KEY) return false;
    if (this.getCircuitState() === "open") return false;
    if (this.isRateLimited()) return false;
    return true;
  }

  // -------------------------------------------------------------------------
  // HTTP transport with retry, circuit breaker, and rate limiting
  // -------------------------------------------------------------------------

  private async post<T>(url: string, body: unknown): Promise<T> {
    this.assertCircuitAllowsRequest();
    this.recordRequest();

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 1 s, 2 s
        const delayMs = RETRY_BASE_MS * 2 ** (attempt - 1);
        await sleep(delayMs);
      }

      try {
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: {
            Authorization: env.OPENROUTESERVICE_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          this.onSuccess();
          return (await response.json()) as T;
        }

        // Transient errors that may resolve on retry
        if (
          (response.status === 429 || response.status === 503) &&
          attempt < MAX_RETRIES
        ) {
          lastError = new OrsError(
            `ORS ${response.status}: ${response.statusText}`,
            response.status,
          );
          continue;
        }

        // Non-retryable server error
        const errorBody = await response.text().catch(() => "");
        this.onFailure();
        throw new OrsError(
          `ORS ${response.status}: ${errorBody || response.statusText}`,
          response.status,
        );
      } catch (err) {
        if (err instanceof OrsError) throw err;

        // Network / timeout errors are transient
        lastError =
          err instanceof Error
            ? err
            : new Error(String(err));

        if (attempt === MAX_RETRIES) {
          this.onFailure();
          throw new OrsError(
            `ORS request failed after ${MAX_RETRIES + 1} attempts: ${lastError.message}`,
          );
        }
      }
    }

    // Unreachable, but satisfies the type checker
    this.onFailure();
    throw lastError ?? new OrsError("ORS request failed");
  }

  // -------------------------------------------------------------------------
  // Circuit breaker
  // -------------------------------------------------------------------------

  /**
   * Why a circuit breaker?
   * If ORS is down, hammering it wastes our rate-limit budget and adds
   * latency. After CB_FAILURE_THRESHOLD consecutive failures we "open"
   * the circuit for CB_OPEN_DURATION_MS, then allow one "half-open"
   * probe to see if the service recovered.
   */
  private getCircuitState(): CircuitState {
    if (this.circuitState === "open") {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= CB_OPEN_DURATION_MS) {
        // Enough time has passed — allow a single probe request
        this.circuitState = "half-open";
      }
    }
    return this.circuitState;
  }

  private assertCircuitAllowsRequest(): void {
    const state = this.getCircuitState();
    if (state === "open") {
      throw new OrsError(
        "Circuit breaker is open — ORS temporarily unavailable",
      );
    }
    // "closed" and "half-open" both allow requests
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitState = "closed";
  }

  private onFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= CB_FAILURE_THRESHOLD) {
      this.circuitState = "open";
      this.openedAt = Date.now();
    }
  }

  // -------------------------------------------------------------------------
  // Rate limiter (sliding window)
  // -------------------------------------------------------------------------

  /**
   * Why a client-side rate limiter?
   * ORS free tier is 20 req/min. Exceeding it returns 429 and wastes a
   * retry cycle. By tracking locally we can fail fast and let the caller
   * fall back to the offline model immediately.
   */
  private isRateLimited(): boolean {
    this.pruneOldTimestamps();
    return this.requestTimestamps.length >= RATE_LIMIT_PER_MINUTE;
  }

  private recordRequest(): void {
    this.pruneOldTimestamps();
    if (this.requestTimestamps.length >= RATE_LIMIT_PER_MINUTE) {
      throw new OrsError("ORS rate limit exhausted (20 req/min)");
    }
    this.requestTimestamps.push(Date.now());
  }

  private pruneOldTimestamps(): void {
    const cutoff = Date.now() - 60_000;
    // Drop timestamps older than 60 s from the front of the array
    while (
      this.requestTimestamps.length > 0 &&
      this.requestTimestamps[0]! < cutoff
    ) {
      this.requestTimestamps.shift();
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wraps native fetch with an AbortController-based timeout. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class OrsError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "OrsError";
  }
}

// ---------------------------------------------------------------------------
// ORS raw response shapes (internal, not exported)
// ---------------------------------------------------------------------------

interface OrsIsochroneRaw {
  type: string;
  features: Array<{
    type: string;
    properties: { value: number; center: number[] };
    geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
  }>;
}

interface OrsMatrixRaw {
  durations: number[][];
  sources: Array<{ location: number[]; snapped_distance: number }>;
  destinations: Array<{ location: number[]; snapped_distance: number }>;
}
