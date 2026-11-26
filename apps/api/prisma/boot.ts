import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

async function boot() {
  console.log("🚀 Running Thikana API database bootstrap...");

  // 1. Push Prisma schema (creates tables if they don't exist yet)
  console.log("📦 Pushing Prisma schema...");
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
  });

  // 2. Check if database already has PG listings
  const count = await prisma.pGListing.count().catch(() => 0);

  if (count === 0) {
    console.log("🌱 Empty database detected — seeding initial Hyderabad PGs & Buddies...");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  } else {
    console.log(`✅ Database already has ${count} PG listings — skipping seed.`);
  }

  // 3. Ensure PostGIS extension, geometry columns, and spatial GiST indexes exist
  console.log("🗺️  Ensuring PostGIS spatial columns & indexes...");
  execSync("npx tsx prisma/postgis-setup.ts", { stdio: "inherit" });

  console.log("🎉 Database bootstrap complete!");
}

boot()
  .catch((err) => {
    console.error("❌ Bootstrap failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
