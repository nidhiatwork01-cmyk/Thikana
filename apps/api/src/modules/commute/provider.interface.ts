import { IsochroneRequest, IsochroneResponse, LatLng } from "@thikana/shared-types";

/**
 * TravelTimeProvider: Pluggable interface for isochrone computation.
 *
 * Why an interface? External routing services (ORS, HERE, TomTom) have
 * rate limits, latency, and billing. By coding against this contract,
 * the system seamlessly falls back from live ORS to our offline
 * Hyderabad peak-hour model when the API key is missing, the quota is
 * exhausted, or the network is down.
 */
export interface TravelTimeProvider {
  readonly name: string;

  /**
   * Compute an isochrone polygon around a destination.
   * Returns a GeoJSON FeatureCollection with one or more time-band features.
   */
  getIsochrone(request: IsochroneRequest): Promise<IsochroneResponse>;

  /**
   * Compute point-to-point travel time in minutes between two coordinates.
   * Used for per-PG commute estimates after the isochrone is drawn.
   */
  getTravelTime(
    origin: LatLng,
    destination: LatLng,
    mode: string,
    departureTime?: string
  ): Promise<number>;

  /** Whether this provider is currently available (has key, is online). */
  isAvailable(): Promise<boolean>;
}
