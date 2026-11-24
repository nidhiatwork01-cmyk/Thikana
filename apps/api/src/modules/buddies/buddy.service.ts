import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../errors/index.js";
import {
  ListBuddiesQuery,
  CreateHelpRequestInput,
  CreateBuddyReviewInput,
} from "./buddy.schema.js";

export class BuddyService {
  /**
   * List all verified local buddies with faceted filtering
   */
  async listBuddies(query: ListBuddiesQuery) {
    const where: any = {};

    if (query.verificationTier) {
      where.verificationTier = query.verificationTier;
    }
    if (query.maxFee) {
      where.hourlyFee = { lte: query.maxFee };
    }
    if (query.locality) {
      where.serviceLocalities = { has: query.locality };
    }
    if (query.language) {
      where.languages = { has: query.language };
    }
    if (query.availableDay) {
      where.availableDays = { has: query.availableDay };
    }

    const buddies = await prisma.buddyProfile.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        reviewsReceived: {
          take: 3,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ rating: "desc" }, { totalReviews: "desc" }],
      take: query.limit,
    });

    return buddies.map((b) => ({
      id: b.id,
      userId: b.userId,
      fullName: b.user.fullName,
      bio: b.bio,
      languages: b.languages,
      serviceLocalities: b.serviceLocalities,
      serviceAreaCenter: { lat: b.centerLat, lng: b.centerLng },
      serviceRadiusKm: b.radiusKm,
      hourlyFee: Number(b.hourlyFee),
      isDeclaredNotBroker: b.isDeclaredNotBroker,
      verificationTier: b.verificationTier,
      rating: b.rating,
      totalReviews: b.totalReviews,
      avgResponseMinutes: b.avgResponseMinutes,
      availableDays: b.availableDays,
      createdAt: b.createdAt.toISOString(),
      recentReviews: b.reviewsReceived.map((r) => ({
        id: r.id,
        rating: r.rating,
        tags: r.tags,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
    }));
  }

  /**
   * Get complete Buddy profile with all reviews
   */
  async getBuddyById(id: string) {
    const buddy = await prisma.buddyProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        reviewsReceived: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!buddy) {
      throw new NotFoundError("Buddy profile not found");
    }

    return {
      id: buddy.id,
      userId: buddy.userId,
      fullName: buddy.user.fullName,
      bio: buddy.bio,
      languages: buddy.languages,
      serviceLocalities: buddy.serviceLocalities,
      serviceAreaCenter: { lat: buddy.centerLat, lng: buddy.centerLng },
      serviceRadiusKm: buddy.radiusKm,
      hourlyFee: Number(buddy.hourlyFee),
      isDeclaredNotBroker: buddy.isDeclaredNotBroker,
      verificationTier: buddy.verificationTier,
      rating: buddy.rating,
      totalReviews: buddy.totalReviews,
      avgResponseMinutes: buddy.avgResponseMinutes,
      availableDays: buddy.availableDays,
      createdAt: buddy.createdAt.toISOString(),
      reviews: buddy.reviewsReceived.map((r) => ({
        id: r.id,
        rating: r.rating,
        tags: r.tags,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Create a new Help Request
   */
  async createHelpRequest(seekerId: string, input: CreateHelpRequestInput) {
    const buddy = await prisma.buddyProfile.findUnique({
      where: { id: input.buddyId },
    });
    if (!buddy) {
      throw new NotFoundError("Selected buddy not found");
    }
    if (buddy.userId === seekerId) {
      throw new BadRequestError("You cannot request help from your own buddy profile");
    }

    // Set expiration to 24 hours from request creation
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const request = await prisma.helpRequest.create({
      data: {
        seekerId,
        buddyId: input.buddyId,
        channel: input.channel as any,
        targetLocalities: input.targetLocalities,
        maxBudget: input.maxBudget,
        note: input.note,
        agreedFee: input.agreedFee,
        status: "REQUESTED",
        expiresAt,
      },
      include: {
        seeker: { select: { fullName: true } },
        buddy: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
    });

    return {
      id: request.id,
      seekerId: request.seekerId,
      seekerName: request.seeker.fullName,
      buddyId: request.buddyId,
      buddyName: request.buddy.user.fullName,
      status: request.status,
      channel: request.channel,
      targetLocalities: request.targetLocalities,
      maxBudget: Number(request.maxBudget),
      note: request.note,
      agreedFee: Number(request.agreedFee),
      seekerSharedPhone: request.seekerSharedPhone,
      buddySharedPhone: request.buddySharedPhone,
      expiresAt: request.expiresAt.toISOString(),
      createdAt: request.createdAt.toISOString(),
    };
  }

  /**
   * State Machine Transition for Help Request
   * Valid Transitions:
   * REQUESTED -> ACCEPTED / DECLINED / CANCELLED
   * ACCEPTED -> IN_PROGRESS / CANCELLED
   * IN_PROGRESS -> COMPLETED
   */
  async updateHelpRequestStatus(
    userId: string,
    requestId: string,
    newStatus: string
  ) {
    const req = await prisma.helpRequest.findUnique({
      where: { id: requestId },
      include: {
        buddy: true,
      },
    });

    if (!req) {
      throw new NotFoundError("Help request not found");
    }

    const isSeeker = req.seekerId === userId;
    const isBuddy = req.buddy.userId === userId;

    if (!isSeeker && !isBuddy) {
      throw new ForbiddenError("Not authorized to manage this help request");
    }

    const currentStatus = req.status;

    // Validate state transitions
    if (newStatus === "ACCEPTED" || newStatus === "DECLINED") {
      if (!isBuddy) {
        throw new ForbiddenError("Only the assigned buddy can accept or decline this request");
      }
      if (currentStatus !== "REQUESTED") {
        throw new BadRequestError(`Cannot transition from ${currentStatus} to ${newStatus}`);
      }
    } else if (newStatus === "CANCELLED") {
      if (!isSeeker && !isBuddy) {
        throw new ForbiddenError("Not authorized to cancel");
      }
      if (currentStatus === "COMPLETED" || currentStatus === "CANCELLED") {
        throw new BadRequestError(`Cannot cancel a ${currentStatus} request`);
      }
    } else if (newStatus === "IN_PROGRESS") {
      if (currentStatus !== "ACCEPTED") {
        throw new BadRequestError(`Cannot start request from status ${currentStatus}`);
      }
    } else if (newStatus === "COMPLETED") {
      if (currentStatus !== "IN_PROGRESS" && currentStatus !== "ACCEPTED") {
        throw new BadRequestError(`Cannot complete request from status ${currentStatus}`);
      }
    }

    const updated = await prisma.helpRequest.update({
      where: { id: requestId },
      data: { status: newStatus as any },
      include: {
        seeker: { select: { fullName: true } },
        buddy: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Dual-Consent Phone Sharing:
   * Phone number is revealed ONLY when both seekerSharedPhone AND buddySharedPhone are true
   */
  async sharePhoneConsent(userId: string, requestId: string, share: boolean) {
    const req = await prisma.helpRequest.findUnique({
      where: { id: requestId },
      include: {
        buddy: true,
        seeker: { select: { phone: true, fullName: true } },
      },
    });

    if (!req) {
      throw new NotFoundError("Help request not found");
    }

    const isSeeker = req.seekerId === userId;
    const isBuddy = req.buddy.userId === userId;

    if (!isSeeker && !isBuddy) {
      throw new ForbiddenError("Not authorized");
    }

    const data: any = {};
    if (isSeeker) data.seekerSharedPhone = share;
    if (isBuddy) data.buddySharedPhone = share;

    const updated = await prisma.helpRequest.update({
      where: { id: requestId },
      data,
      include: {
        seeker: { select: { phone: true, fullName: true } },
        buddy: {
          include: {
            user: { select: { phone: true, fullName: true } },
          },
        },
      },
    });

    const isBothShared = updated.seekerSharedPhone && updated.buddySharedPhone;

    return {
      id: updated.id,
      seekerSharedPhone: updated.seekerSharedPhone,
      buddySharedPhone: updated.buddySharedPhone,
      isPhoneRevealed: isBothShared,
      seekerPhone: isBothShared ? updated.seeker.phone : null,
      buddyPhone: isBothShared ? updated.buddy.user.phone : null,
    };
  }

  /**
   * Submit Review for Completed Help Request
   */
  async createReview(
    userId: string,
    requestId: string,
    input: CreateBuddyReviewInput
  ) {
    const req = await prisma.helpRequest.findUnique({
      where: { id: requestId },
      include: { review: true },
    });

    if (!req) {
      throw new NotFoundError("Help request not found");
    }
    if (req.seekerId !== userId) {
      throw new ForbiddenError("Only the seeker can review this buddy interaction");
    }
    if (req.status !== "COMPLETED") {
      throw new BadRequestError("You can only review a completed help request");
    }
    if (req.review) {
      throw new BadRequestError("A review has already been submitted for this request");
    }

    const review = await prisma.buddyReview.create({
      data: {
        helpRequestId: requestId,
        buddyProfileId: req.buddyId,
        rating: input.rating,
        tags: input.tags,
        comment: input.comment,
      },
    });

    // Recalculate Buddy Average Rating
    const allReviews = await prisma.buddyReview.findMany({
      where: { buddyProfileId: req.buddyId },
      select: { rating: true },
    });

    const avg =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.buddyProfile.update({
      where: { id: req.buddyId },
      data: {
        rating: parseFloat(avg.toFixed(1)),
        totalReviews: allReviews.length,
      },
    });

    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }

  /**
   * Get all help requests involving a user (as seeker or buddy)
   */
  async getMyHelpRequests(userId: string) {
    const requests = await prisma.helpRequest.findMany({
      where: {
        OR: [
          { seekerId: userId },
          { buddy: { userId } },
        ],
      },
      include: {
        seeker: { select: { fullName: true, phone: true } },
        buddy: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
        review: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return requests.map((r) => {
      const isBothShared = r.seekerSharedPhone && r.buddySharedPhone;
      return {
        id: r.id,
        seekerId: r.seekerId,
        seekerName: r.seeker.fullName,
        buddyId: r.buddyId,
        buddyName: r.buddy.user.fullName,
        status: r.status,
        channel: r.channel,
        targetLocalities: r.targetLocalities,
        maxBudget: Number(r.maxBudget),
        note: r.note,
        agreedFee: Number(r.agreedFee),
        seekerSharedPhone: r.seekerSharedPhone,
        buddySharedPhone: r.buddySharedPhone,
        isPhoneRevealed: isBothShared,
        seekerPhone: isBothShared ? r.seeker.phone : null,
        buddyPhone: isBothShared ? r.buddy.user.phone : null,
        hasReview: Boolean(r.review),
        reviewRating: r.review?.rating,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      };
    });
  }
}

export const buddyService = new BuddyService();
