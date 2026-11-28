import { Prisma } from "@prisma/client";
import type {
  IsochroneRequest,
  IsochroneResponse,
  LatLng,
  TravelMode,
  CommutePGListing,
  GeoJsonPolygon,
} from "@thikana/shared-types";
import { TravelTimeProvider } from "./provider.interface.js";
import { HyderabadCalibratedProvider } from "./hyderabad.provider.js";
import { OrsProvider } from "./ors.provider.js";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

/**
 * CommuteService
 *
 * Orchestrates:
 * 1. Pluggable TravelTimeProviders (ORS primary, calibrated Hyderabad model fallback)
 * 2. Geo-spatial Redis caching with coordinate grid snapping (~500m precision)
 * 3. PostGIS ST_Contains spatial filtering of PG listings within the computed polygon
 * 4. Per-listing commute time and distance calculation
 */

export interface CommuteSearchFilterOptions {
  gender?: "MEN" | "WOMEN" | "CO_LIVING";
  maxBudget?: number;
  sharingType?: "SINGLE" | "DOUBLE" | "TRIPLE" | "FOUR_PLUS";
  foodType?: "VEG" | "NON_VEG" | "BOTH" | "NONE";
  sortBy?: "commute" | "price" | "newest" | "rating";
  cursor?: string;
  limit?: number;
}

export interface CommuteSearchResult {
  isochrone: IsochroneResponse;
  pgs: CommutePGListing[];
  hasMore: boolean;
  nextCursor: string | null;
  total: number;
}

export class CommuteService {
  private primaryProvider: TravelTimeProvider;
  private fallbackProvider: TravelTimeProvider;

  constructor() {
    this.primaryProvider = new OrsProvider();
    this.fallbackProvider = new HyderabadCalibratedProvider();
  }

  /**
   * Helper to determine time bucket for cache grouping
   */
  private getTimeBucket(timeStr: string): "am_peak" | "pm_peak" | "shoulder" | "off_peak" {
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

  /**
   * Snaps coordinates to a ~500m grid cell (0.005 degrees)
   * Why: Prevents cache fragmentation when users pick slightly different destination pins
   */
  private getCacheKey(req: IsochroneRequest): string {
    const snappedLat = (Math.round(req.destination.lat / 0.005) * 0.005).toFixed(3);
    const snappedLng = (Math.round(req.destination.lng / 0.005) * 0.005).toFixed(3);
    const bucket = this.getTimeBucket(req.arrivalTime);
    return `iso:${snappedLat},${snappedLng}:${req.travelMode}:${req.maxMinutes}:${bucket}`;
  }

  /**
   * Converts GeoJSON Polygon / MultiPolygon to Well-Known Text (WKT)
   * Why: PostGIS ST_GeomFromText is faster and more reliable across SQL dialects than parsing JSON in SQL
   */
  private geoJsonToWkt(geometry: GeoJsonPolygon): string {
    if (geometry.type === "Polygon") {
      const coords = geometry.coordinates as number[][][];
      const rings = coords.map(
        (ring) => `(${ring.map(([lng, lat]) => `${lng} ${lat}`).join(", ")})`
      );
      return `POLYGON(${rings.join(", ")})`;
    } else if (geometry.type === "MultiPolygon") {
      const coords = geometry.coordinates as number[][][][];
      const polygons = coords.map((poly) => {
        const rings = poly.map(
          (ring) => `(${ring.map(([lng, lat]) => `${lng} ${lat}`).join(", ")})`
        );
        return `(${rings.join(", ")})`;
      });
      return `MULTIPOLYGON(${polygons.join(", ")})`;
    }
    throw new Error(`Unsupported geometry type: ${(geometry as any).type}`);
  }

  /**
   * Compute isochrone polygon with Redis caching and provider failover
   */
  async getIsochrone(request: IsochroneRequest): Promise<IsochroneResponse> {
    const cacheKey = this.getCacheKey(request);

    // 1. Try Redis cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const response: IsochroneResponse = JSON.parse(cached);
        response.metadata.cached = true;
        return response;
      }
    } catch (err: any) {
      console.warn("⚠️ Redis cache read error:", err.message);
    }

    // 2. Determine active provider with failover
    let activeProvider: TravelTimeProvider = this.fallbackProvider;
    try {
      const isPrimaryAvailable = await this.primaryProvider.isAvailable();
      if (isPrimaryAvailable) {
        activeProvider = this.primaryProvider;
      }
    } catch {
      activeProvider = this.fallbackProvider;
    }

    let response: IsochroneResponse;
    try {
      response = await activeProvider.getIsochrone(request);
    } catch (err: any) {
      console.warn(`⚠️ Primary provider ${activeProvider.name} failed:`, err.message);
      response = await this.fallbackProvider.getIsochrone(request);
    }

    // 3. Store in Redis cache (1h TTL for calibrated model, 2h for ORS)
    const ttlSeconds = response.metadata.provider === "openrouteservice" ? 7200 : 3600;
    try {
      await redis.set(cacheKey, JSON.stringify(response), "EX", ttlSeconds);
    } catch (err: any) {
      console.warn("⚠️ Redis cache write error:", err.message);
    }

    return response;
  }

  /**
   * Search PG listings that fall inside the commute isochrone polygon
   */
  async searchPGsInZone(
    request: IsochroneRequest & CommuteSearchFilterOptions
  ): Promise<CommuteSearchResult> {
    // 1. Fetch Isochrone Polygon
    const isochrone = await this.getIsochrone(request);
    const mainFeature = isochrone.features[0];
    if (!mainFeature) {
      return {
        isochrone,
        pgs: [],
        hasMore: false,
        nextCursor: null,
        total: 0,
      };
    }

    const wkt = this.geoJsonToWkt(mainFeature.geometry);
    const destLng = request.destination.lng;
    const destLat = request.destination.lat;

    // 2. Query PostGIS with ST_Contains and spatial distance calculation
    // Note: ST_Distance uses geography for accurate meter-based distances
    const rawMatches = await prisma.$queryRaw<
      Array<{
        id: string;
        distance_meters: number;
      }>
    >`
      SELECT 
        p.id,
        ST_Distance(
          p.location::geography, 
          ST_SetSRID(ST_MakePoint(${destLng}, ${destLat}), 4326)::geography
        ) as distance_meters
      FROM "PGListing" p
      WHERE p."isDeleted" = false
        AND p.location IS NOT NULL
        AND ST_Contains(
          ST_SetSRID(ST_GeomFromText(${wkt}), 4326),
          p.location
        )
      ORDER BY distance_meters ASC
    `;

    if (!rawMatches.length) {
      return {
        isochrone,
        pgs: [],
        hasMore: false,
        nextCursor: null,
        total: 0,
      };
    }

    const matchingIds = rawMatches.map((m) => m.id);
    const distanceMap = new Map(rawMatches.map((m) => [m.id, m.distance_meters / 1000]));

    // 3. Fetch detailed PG listing data with Prisma relations and user filters
    const where: Prisma.PGListingWhereInput = {
      id: { in: matchingIds },
      isDeleted: false,
    };

    if (request.gender) {
      where.gender = request.gender;
    }
    if (request.maxBudget) {
      where.minRent = { lte: request.maxBudget };
    }
    if (request.foodType) {
      where.foodType = request.foodType;
    }
    if (request.sharingType) {
      where.rooms = {
        some: {
          sharingType: request.sharingType,
          availableBeds: { gt: 0 },
        },
      };
    }

    const listings = await prisma.pGListing.findMany({
      where,
      include: {
        rooms: true,
        amenities: {
          include: {
            amenity: true,
          },
        },
        images: {
          orderBy: { displayOrder: "asc" },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    // 4. Calculate individual commute times using calibrated Hyderabad peak-hour model
    // Why: Per-listing travel time with the calibrated model runs in microseconds and incorporates
    // corridor-specific traffic slowdowns without exhausting the external API quota on every listing.
    const enrichedListings: CommutePGListing[] = await Promise.all(
      listings.map(async (pg) => {
        const origin: LatLng = { lat: pg.latitude, lng: pg.longitude };
        const commuteMins = await this.fallbackProvider.getTravelTime(
          origin,
          request.destination,
          request.travelMode,
          request.arrivalTime
        );

        const distanceKm = parseFloat(
          (distanceMap.get(pg.id) ?? 0).toFixed(2)
        );

        const coverImage = pg.images.find((img) => img.isCover)?.url || pg.images[0]?.url;
        const roomRents = pg.rooms.map((r) => Number(r.rentPerMonth));
        const minRent = Number(pg.minRent);
        const maxRent = roomRents.length > 0 ? Math.max(minRent, ...roomRents) : minRent;
        const reviewCount = pg.reviews.length;
        const avgRating =
          reviewCount > 0
            ? Number(
                (pg.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
              )
            : undefined;

        return {
          id: pg.id,
          title: pg.title,
          slug: pg.slug,
          address: pg.address,
          location: { lat: pg.latitude, lng: pg.longitude },
          minRent,
          maxRent,
          depositAmount: Number(pg.depositAmount),
          avgRating,
          reviewCount,
          gender: pg.gender,
          sharingTypes: Array.from(new Set(pg.rooms.map((r) => r.sharingType))),
          foodType: pg.foodType,
          isFoodIncluded: pg.isFoodIncluded,
          amenities: pg.amenities.map((a) => a.amenity.name),
          coverImageUrl: coverImage,
          images: pg.images.map((img) => img.url),
          isVerified: pg.isVerified,
          estimatedCommuteMinutes: commuteMins,
          distanceKm,
        };
      })
    );

    // Filter out items that exceed maxMinutes (isochrones are approx, individual routing is precise)
    const validCommuteListings = enrichedListings.filter(
      (item) => item.estimatedCommuteMinutes <= request.maxMinutes * 1.15 // 15% tolerance
    );

    // 5. Apply sorting
    const sortBy = request.sortBy || "commute";
    validCommuteListings.sort((a, b) => {
      switch (sortBy) {
        case "commute":
          return a.estimatedCommuteMinutes - b.estimatedCommuteMinutes;
        case "price":
          return a.minRent - b.minRent;
        default:
          return a.estimatedCommuteMinutes - b.estimatedCommuteMinutes;
      }
    });

    // 6. Pagination
    const limit = request.limit || 20;
    let startIndex = 0;
    if (request.cursor) {
      const cursorIndex = validCommuteListings.findIndex((item) => item.id === request.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedItems = validCommuteListings.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < validCommuteListings.length;
    const nextCursor = hasMore ? paginatedItems[paginatedItems.length - 1]?.id ?? null : null;

    return {
      isochrone,
      pgs: paginatedItems,
      hasMore,
      nextCursor,
      total: validCommuteListings.length,
    };
  }

  /**
   * Async compute zone with PGs for background queue workers
   */
  async computeZoneWithPGs(data: {
    destination: LatLng;
    arrivalTime: string;
    travelMode: TravelMode;
    maxMinutes: number;
  }): Promise<{
    isochrone: IsochroneResponse;
    pgsInZone: CommutePGListing[];
    provider: string;
    cached: boolean;
  }> {
    const result = await this.searchPGsInZone({
      destination: data.destination,
      arrivalTime: data.arrivalTime,
      travelMode: data.travelMode,
      maxMinutes: data.maxMinutes,
      limit: 100, // return all up to 100 for background job
    });

    return {
      isochrone: result.isochrone,
      pgsInZone: result.pgs,
      provider: result.isochrone.metadata.provider,
      cached: result.isochrone.metadata.cached,
    };
  }
}

export const commuteService = new CommuteService();
