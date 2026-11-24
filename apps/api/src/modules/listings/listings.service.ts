import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ForbiddenError } from "../../errors/index.js";
import { PgFilterQuery, CreatePgInput, UpdatePgInput } from "./listings.schema.js";
import { Prisma } from "@prisma/client";

export class ListingsService {
  async listPgs(query: PgFilterQuery) {
    const {
      locality,
      gender,
      foodType,
      minRent,
      maxRent,
      sharingType,
      furnishedStatus,
      amenities,
      verifiedOnly,
      search,
      sort,
      cursor,
      limit = 12
    } = query;

    const where: Prisma.PGListingWhereInput = {
      isDeleted: false
    };

    if (locality) {
      where.locality = {
        OR: [{ slug: locality }, { id: locality }, { name: { contains: locality, mode: "insensitive" } }]
      };
    }

    if (gender) where.gender = gender;
    if (foodType) where.foodType = foodType;
    if (furnishedStatus) where.furnishedStatus = furnishedStatus;
    if (verifiedOnly) where.isVerified = true;

    if (minRent !== undefined || maxRent !== undefined) {
      where.minRent = {};
      if (minRent !== undefined) where.minRent.gte = new Prisma.Decimal(minRent);
      if (maxRent !== undefined) where.minRent.lte = new Prisma.Decimal(maxRent);
    }

    if (sharingType) {
      where.rooms = {
        some: { sharingType }
      };
    }

    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities];
      where.amenities = {
        some: {
          amenity: {
            OR: [{ id: { in: amenityList } }, { name: { in: amenityList } }]
          }
        }
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }

    // Determine Sort Order
    let orderBy: Prisma.PGListingOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];
    if (sort === "price_asc") {
      orderBy = [{ minRent: "asc" }, { id: "asc" }];
    } else if (sort === "price_desc") {
      orderBy = [{ minRent: "desc" }, { id: "desc" }];
    }

    // Cursor Pagination: fetch limit + 1 to check if there is a next page
    const take = limit + 1;
    const paginationArgs: Prisma.PGListingFindManyArgs = {
      where,
      orderBy,
      take,
      include: {
        locality: true,
        rooms: true,
        amenities: {
          include: {
            amenity: true
          }
        },
        images: {
          orderBy: { displayOrder: "asc" },
          take: 3
        },
        _count: {
          select: { reviews: true }
        }
      }
    };

    if (cursor) {
      paginationArgs.cursor = { id: cursor };
      paginationArgs.skip = 1; // Skip the cursor itself
    }

    const items = await prisma.pGListing.findMany(paginationArgs);

    let nextCursor: string | null = null;
    let hasMore = false;

    if (items.length > limit) {
      hasMore = true;
      items.pop(); // Remove the extra record
      nextCursor = items[items.length - 1]?.id || null;
    }

    const totalCount = await prisma.pGListing.count({ where });

    return {
      items: items.map(this.formatPgCard),
      nextCursor,
      hasMore,
      totalCount
    };
  }

  async getPgById(id: string) {
    const pg = await prisma.pGListing.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isDeleted: false
      },
      include: {
        locality: {
          include: { landmarks: true }
        },
        rooms: true,
        amenities: {
          include: { amenity: true }
        },
        images: {
          orderBy: { displayOrder: "asc" }
        },
        reviews: {
          include: {
            user: { select: { fullName: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 10
        },
        owner: {
          select: { id: true, fullName: true, phone: true }
        }
      }
    });

    if (!pg) {
      throw new NotFoundError("PG listing not found");
    }

    return pg;
  }

  async createPg(ownerId: string, input: CreatePgInput) {
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

    const pg = await prisma.pGListing.create({
      data: {
        title: input.title,
        slug,
        description: input.description,
        address: input.address,
        localityId: input.localityId,
        latitude: input.latitude,
        longitude: input.longitude,
        minRent: new Prisma.Decimal(input.minRent),
        depositAmount: new Prisma.Decimal(input.depositAmount),
        maintenanceFee: new Prisma.Decimal(input.maintenanceFee),
        gender: input.gender,
        foodType: input.foodType,
        isFoodIncluded: input.isFoodIncluded,
        furnishedStatus: input.furnishedStatus,
        curfewTime: input.curfewTime,
        rulesNoticePeriod: input.rulesNoticePeriod,
        contactPhone: input.contactPhone,
        ownerId,
        rooms: {
          create: input.rooms.map((r) => ({
            sharingType: r.sharingType,
            rentPerMonth: new Prisma.Decimal(r.rentPerMonth),
            totalBeds: r.totalBeds,
            availableBeds: r.availableBeds
          }))
        },
        amenities: {
          create: input.amenityIds.map((amenityId) => ({
            amenityId
          }))
        },
        images: {
          create: input.imageUrls.map((url, idx) => ({
            url,
            isCover: idx === 0,
            displayOrder: idx
          }))
        }
      }
    });

    // Update PostGIS geography point geometry
    await prisma.$executeRawUnsafe(`
      UPDATE "PGListing"
      SET location = ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)
      WHERE id = '${pg.id}';
    `);

    return this.getPgById(pg.id);
  }

  async updatePg(pgId: string, userId: string, userRoles: string[], input: UpdatePgInput) {
    const existing = await prisma.pGListing.findUnique({
      where: { id: pgId }
    });

    if (!existing || existing.isDeleted) {
      throw new NotFoundError("PG listing not found");
    }

    const isAdmin = userRoles.includes("ADMIN");
    if (!isAdmin && existing.ownerId !== userId) {
      throw new ForbiddenError("You can only modify your own PG listings");
    }

    const updated = await prisma.pGListing.update({
      where: { id: pgId },
      data: {
        title: input.title,
        description: input.description,
        address: input.address,
        minRent: input.minRent !== undefined ? new Prisma.Decimal(input.minRent) : undefined,
        depositAmount: input.depositAmount !== undefined ? new Prisma.Decimal(input.depositAmount) : undefined,
        maintenanceFee: input.maintenanceFee !== undefined ? new Prisma.Decimal(input.maintenanceFee) : undefined,
        gender: input.gender,
        foodType: input.foodType,
        isFoodIncluded: input.isFoodIncluded,
        furnishedStatus: input.furnishedStatus,
        curfewTime: input.curfewTime,
        rulesNoticePeriod: input.rulesNoticePeriod,
        contactPhone: input.contactPhone,
        latitude: input.latitude,
        longitude: input.longitude
      }
    });

    if (input.latitude && input.longitude) {
      await prisma.$executeRawUnsafe(`
        UPDATE "PGListing"
        SET location = ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)
        WHERE id = '${pgId}';
      `);
    }

    return this.getPgById(updated.id);
  }

  async deletePg(pgId: string, userId: string, userRoles: string[]) {
    const existing = await prisma.pGListing.findUnique({ where: { id: pgId } });
    if (!existing) throw new NotFoundError("PG listing not found");

    const isAdmin = userRoles.includes("ADMIN");
    if (!isAdmin && existing.ownerId !== userId) {
      throw new ForbiddenError("You can only delete your own PG listings");
    }

    // Soft delete
    await prisma.pGListing.update({
      where: { id: pgId },
      data: { isDeleted: true }
    });

    return { id: pgId, deleted: true };
  }

  private formatPgCard(pg: any) {
    return {
      id: pg.id,
      title: pg.title,
      slug: pg.slug,
      address: pg.address,
      locality: pg.locality?.name || "",
      localitySlug: pg.locality?.slug || "",
      latitude: pg.latitude,
      longitude: pg.longitude,
      minRent: Number(pg.minRent),
      depositAmount: Number(pg.depositAmount),
      gender: pg.gender,
      foodType: pg.foodType,
      isFoodIncluded: pg.isFoodIncluded,
      furnishedStatus: pg.furnishedStatus,
      isVerified: pg.isVerified,
      coverImage: pg.images[0]?.url || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
      images: pg.images.map((img: any) => img.url),
      sharingTypes: pg.rooms.map((r: any) => r.sharingType),
      amenities: pg.amenities.map((a: any) => a.amenity.name),
      reviewCount: pg._count?.reviews || 0,
      createdAt: pg.createdAt
    };
  }
}

export const listingsService = new ListingsService();
