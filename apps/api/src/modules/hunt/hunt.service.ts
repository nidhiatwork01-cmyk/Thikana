import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ForbiddenError } from "../../errors/index.js";
import {
  CreateHuntItemInput,
  UpdateHuntItemInput,
  VisitPlanRequestInput,
  HuntScoringWeightsInput,
} from "./hunt.schema.js";
import { solve2Opt, buildItinerary, TspNode } from "./tsp.js";
import type { HuntItem, VisitPlanResult, OnSiteChecklist } from "@thikana/shared-types";

export class HuntService {
  /**
   * Helper to format DB HuntItem to domain shape
   */
  private formatItem(dbItem: any): HuntItem {
    const checklist: OnSiteChecklist = {
      waterPressure: 3,
      waterSmellClean: true,
      ventilationSunlight: 3,
      trafficNoiseLevel: 3,
      safetyCctvPresent: false,
      visitorPolicy: "DAY_ONLY",
      noticePeriodDays: 30,
      lockInMonths: 0,
      notes: "",
      photos: [],
      ...(dbItem.checklistData as object),
    };

    return {
      id: dbItem.id,
      userId: dbItem.userId,
      pgListingId: dbItem.pgListingId,
      name: dbItem.name,
      location: {
        lat: dbItem.latitude,
        lng: dbItem.longitude,
      },
      address: dbItem.address,
      rent: Number(dbItem.rent),
      phone: dbItem.phone || undefined,
      sourceUrl: dbItem.sourceUrl || undefined,
      checklist,
      calculatedScore: dbItem.calculatedScore ? Number(dbItem.calculatedScore) : undefined,
      status: dbItem.status,
      visitOrder: dbItem.visitOrder ?? undefined,
      updatedAt: dbItem.updatedAt.toISOString(),
    };
  }

  /**
   * List all hunt items belonging to a user
   */
  async listItems(userId: string): Promise<HuntItem[]> {
    const items = await prisma.huntItem.findMany({
      where: { userId },
      orderBy: [
        { visitOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return items.map((i) => this.formatItem(i));
  }

  /**
   * Add a new PG to user's Hunt workspace
   */
  async createItem(userId: string, input: CreateHuntItemInput): Promise<HuntItem> {
    // If pgListingId is provided, optionally autofill details
    let name = input.name;
    let address = input.address;
    let lat = input.location.lat;
    let lng = input.location.lng;
    let rent = input.rent;
    let phone = input.phone;

    if (input.pgListingId) {
      const pg = await prisma.pGListing.findUnique({
        where: { id: input.pgListingId },
      });
      if (pg) {
        name = name || pg.title;
        address = address || pg.address;
        lat = lat || pg.latitude;
        lng = lng || pg.longitude;
        rent = rent || Number(pg.minRent);
        phone = phone || pg.contactPhone;
      }
    }

    const created = await prisma.huntItem.create({
      data: {
        userId,
        pgListingId: input.pgListingId,
        name,
        address,
        latitude: lat,
        longitude: lng,
        rent,
        phone,
        sourceUrl: input.sourceUrl,
        checklistData: (input.checklist as any) || {},
        status: "SAVED",
      },
    });

    return this.formatItem(created);
  }

  /**
   * Update hunt item (checklist, status, rent)
   */
  async updateItem(
    userId: string,
    id: string,
    input: UpdateHuntItemInput
  ): Promise<HuntItem> {
    const existing = await prisma.huntItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Hunt item not found");
    }
    if (existing.userId !== userId) {
      throw new ForbiddenError("Not authorized to update this hunt item");
    }

    const updated = await prisma.huntItem.update({
      where: { id },
      data: {
        name: input.name,
        address: input.address,
        rent: input.rent,
        phone: input.phone,
        sourceUrl: input.sourceUrl,
        status: input.status as any,
        visitOrder: input.visitOrder,
        checklistData: input.checklist
          ? (input.checklist as any)
          : undefined,
      },
    });

    return this.formatItem(updated);
  }

  /**
   * Delete hunt item
   */
  async deleteItem(userId: string, id: string): Promise<{ success: boolean }> {
    const existing = await prisma.huntItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Hunt item not found");
    }
    if (existing.userId !== userId) {
      throw new ForbiddenError("Not authorized to delete this hunt item");
    }

    await prisma.huntItem.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Calculate Personal Weighted Score (0-100) based on on-site inspection
   */
  async scoreItem(
    userId: string,
    id: string,
    weights: HuntScoringWeightsInput
  ): Promise<{ score: number; breakdown: Record<string, number> }> {
    const existing = await prisma.huntItem.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Hunt item not found");
    }

    const checklist: OnSiteChecklist = {
      waterPressure: 3,
      waterSmellClean: true,
      ventilationSunlight: 3,
      trafficNoiseLevel: 3,
      safetyCctvPresent: false,
      visitorPolicy: "DAY_ONLY",
      noticePeriodDays: 30,
      lockInMonths: 0,
      notes: "",
      photos: [],
      ...(existing.checklistData as object),
    };

    // Calculate normalized 0-100 scores per category
    const rent = Number(existing.rent);
    const priceScore = Math.max(0, Math.min(100, 100 - ((rent - 6000) / 200)));

    const cleanScore =
      checklist.waterPressure * 10 +
      (checklist.waterSmellClean ? 30 : 0) +
      checklist.ventilationSunlight * 4;

    const safetyScore =
      (checklist.safetyCctvPresent ? 40 : 15) +
      (checklist.visitorPolicy === "ANYTIME" ? 40 : checklist.visitorPolicy === "DAY_ONLY" ? 30 : 15) +
      (checklist.lockInMonths === 0 ? 20 : 0);

    const vibeScore =
      checklist.trafficNoiseLevel * 10 +
      (checklist.curfewTime?.toLowerCase().includes("none") ? 30 : 15) +
      Math.min(20, (checklist.wifiSpeedMbps || 30) / 5);

    const foodScore = (checklist.foodTasteRating || 3) * 20;

    // Default commute score (or 80 default)
    const commuteScore = 80;

    const breakdown = {
      commute: Math.round(commuteScore),
      price: Math.round(priceScore),
      cleanliness: Math.round(cleanScore),
      safety: Math.round(safetyScore),
      vibe: Math.round(vibeScore),
      food: Math.round(foodScore),
    };

    const finalScore = Math.round(
      breakdown.commute * weights.commute +
      breakdown.price * weights.price +
      breakdown.cleanliness * weights.cleanliness +
      breakdown.safety * weights.safety +
      breakdown.vibe * weights.vibe +
      breakdown.food * weights.food
    );

    // Persist calculated score in DB
    await prisma.huntItem.update({
      where: { id },
      data: { calculatedScore: finalScore },
    });

    return { score: finalScore, breakdown };
  }

  /**
   * Plan and optimize visiting route across candidate PGs using 2-opt TSP
   */
  async planRoute(
    userId: string,
    input: VisitPlanRequestInput
  ): Promise<VisitPlanResult> {
    const items = await prisma.huntItem.findMany({
      where: {
        userId,
        id: { in: input.huntItemIds },
      },
    });

    if (items.length === 0) {
      throw new NotFoundError("None of the specified hunt items were found");
    }

    const startNode: TspNode = {
      id: "start",
      name: "Starting Point",
      location: input.startLocation,
    };

    const destNodes: TspNode[] = items.map((i) => ({
      id: i.id,
      name: i.name,
      location: { lat: i.latitude, lng: i.longitude },
    }));

    // Solve TSP using 2-opt heuristic
    const orderedNodes = solve2Opt(startNode, destNodes);

    // Build timeline and road legs
    const itinerary = buildItinerary(
      startNode,
      orderedNodes,
      input.dayStartTime,
      input.minutesPerVisit
    );

    // Map ordered nodes back to full HuntItems and update visitOrder in DB
    const itemMap = new Map(items.map((i) => [i.id, this.formatItem(i)]));
    const orderedItems: HuntItem[] = [];

    for (let idx = 0; idx < orderedNodes.length; idx++) {
      const node = orderedNodes[idx]!;
      const item = itemMap.get(node.id);
      if (item) {
        item.visitOrder = idx + 1;
        orderedItems.push(item);

        // Update visit order in DB asynchronously
        await prisma.huntItem.update({
          where: { id: item.id },
          data: { visitOrder: idx + 1, status: "VISIT_PLANNED" },
        }).catch(() => {});
      }
    }

    return {
      orderedItems,
      timeline: itinerary.timeline,
      legs: itinerary.legs,
      totalDistanceKm: itinerary.totalDistanceKm,
      totalTimeMinutes: itinerary.totalTimeMinutes,
    };
  }
}

export const huntService = new HuntService();
