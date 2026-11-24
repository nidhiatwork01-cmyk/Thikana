import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupPostGIS() {
  console.log("🗺️  Setting up PostGIS spatial extensions and GiST indexes...");

  try {
    // 1. Enable PostGIS extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    console.log("✅ PostGIS extension enabled.");

    // 2. Check PostGIS version
    const versionResult = await prisma.$queryRawUnsafe<Array<{ postgis_version: string }>>(
      `SELECT PostGIS_Version() as postgis_version;`
    );
    console.log(`📌 PostGIS Version: ${versionResult[0]?.postgis_version}`);

    // 3. Add geometry column to PGListing if not exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PGListing" 
      ADD COLUMN IF NOT EXISTS location geometry(Point, 4326);
    `);
    console.log("✅ PGListing.location geometry column added.");

    // 4. Populate location points from latitude and longitude (SRID 4326 = WGS 84 GPS standard)
    await prisma.$executeRawUnsafe(`
      UPDATE "PGListing" 
      SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
      WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;
    `);
    console.log("✅ PGListing.location geometry populated.");

    // 5. Create GiST spatial index on PGListing(location)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_pg_location_gist 
      ON "PGListing" USING GIST (location);
    `);
    console.log("✅ GiST index created: idx_pg_location_gist");

    // 6. Add geometry column to BuddyProfile for service radius buffer
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "BuddyProfile" 
      ADD COLUMN IF NOT EXISTS service_area geometry(Polygon, 4326);
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE "BuddyProfile"
      SET service_area = ST_Buffer(
        ST_SetSRID(ST_MakePoint("centerLng", "centerLat"), 4326)::geography,
        "radiusKm" * 1000
      )::geometry
      WHERE service_area IS NULL AND "centerLat" IS NOT NULL;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_buddy_service_area_gist 
      ON "BuddyProfile" USING GIST (service_area);
    `);
    console.log("✅ GiST index created: idx_buddy_service_area_gist");

    console.log("🚀 PostGIS topology setup complete!");
  } catch (error) {
    console.error("❌ PostGIS setup error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupPostGIS();
