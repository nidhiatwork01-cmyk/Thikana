import { PrismaClient, Role, GenderType, FoodType, FurnishedStatus, SharingType, VerificationTier } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Thikana Hyderabad Database Seeding...");

  // 1. Clean existing records (in reverse dependency order)
  await prisma.inspectionItem.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.tenancy.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.buddyReview.deleteMany({});
  await prisma.helpRequest.deleteMany({});
  await prisma.buddyProfile.deleteMany({});
  await prisma.shortlist.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.pGAmenity.deleteMany({});
  await prisma.pGImage.deleteMany({});
  await prisma.roomOption.deleteMany({});
  await prisma.huntItem.deleteMany({});
  await prisma.pGListing.deleteMany({});
  await prisma.landmark.deleteMany({});
  await prisma.locality.deleteMany({});
  await prisma.amenity.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("🧹 Cleaned existing tables.");

  // 2. Hash default password
  const defaultPasswordHash = await argon2.hash("Thikana@2026");

  // 3. Create Demo Users
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@thikana.local",
      passwordHash: defaultPasswordHash,
      fullName: "Thikana Admin",
      phone: "+919876543210",
      phoneVerified: true,
      roles: [Role.ADMIN, Role.USER]
    }
  });

  const demoOwner = await prisma.user.create({
    data: {
      email: "owner@hyderabadpg.com",
      passwordHash: defaultPasswordHash,
      fullName: "K. Venkat Reddy",
      phone: "+919849012345",
      phoneVerified: true,
      roles: [Role.OWNER, Role.USER]
    }
  });

  const demoSeeker = await prisma.user.create({
    data: {
      email: "seeker@gmail.com",
      passwordHash: defaultPasswordHash,
      fullName: "Ananya Sharma",
      phone: "+919123456789",
      phoneVerified: true,
      roles: [Role.USER]
    }
  });

  // 4. Seed Standard Amenities
  const amenityDefs = [
    { name: "High-Speed WiFi", iconKey: "wifi", category: "UTILITY" },
    { name: "Air Conditioning (AC)", iconKey: "wind", category: "COMFORT" },
    { name: "Power Backup (Generator)", iconKey: "zap", category: "UTILITY" },
    { name: "Attached Washroom", iconKey: "bath", category: "COMFORT" },
    { name: "Daily Housekeeping", iconKey: "sparkles", category: "UTILITY" },
    { name: "Washing Machine / Laundry", iconKey: "shirt", category: "UTILITY" },
    { name: "CCTV & Biometric Access", iconKey: "shield-check", category: "SAFETY" },
    { name: "2-Wheeler Parking", iconKey: "bike", category: "COMFORT" },
    { name: "4-Wheeler Parking", iconKey: "car", category: "COMFORT" },
    { name: "RO Water Purifier", iconKey: "droplets", category: "SAFETY" },
    { name: "Geyser (Hot Water)", iconKey: "flame", category: "UTILITY" },
    { name: "Fridge / Microwave", iconKey: "refrigerator", category: "COMFORT" }
  ];

  const amenities = await Promise.all(
    amenityDefs.map((a) =>
      prisma.amenity.create({
        data: a
      })
    )
  );
  const amenityMap = new Map(amenities.map((a) => [a.name, a.id]));

  // 5. Seed Hyderabad Localities
  const localitiesData = [
    { name: "HITEC City", slug: "hitec-city", latitude: 17.4483, longitude: 78.3742 },
    { name: "Madhapur", slug: "madhapur", latitude: 17.4486, longitude: 78.3908 },
    { name: "Gachibowli", slug: "gachibowli", latitude: 17.4401, longitude: 78.3489 },
    { name: "Kondapur", slug: "kondapur", latitude: 17.4699, longitude: 78.3578 },
    { name: "Financial District", slug: "financial-district", latitude: 17.4156, longitude: 78.3385 },
    { name: "Ameerpet", slug: "ameerpet", latitude: 17.4375, longitude: 78.4482 },
    { name: "Kukatpally", slug: "kukatpally", latitude: 17.4933, longitude: 78.3914 },
    { name: "Banjara Hills", slug: "banjara-hills", latitude: 17.4156, longitude: 78.4357 },
    { name: "Begumpet", slug: "begumpet", latitude: 17.4447, longitude: 78.4664 },
    { name: "Mehdipatnam", slug: "mehdipatnam", latitude: 17.3916, longitude: 78.4418 },
    { name: "Uppal", slug: "uppal", latitude: 17.4018, longitude: 78.5602 }
  ];

  const createdLocalities = await Promise.all(
    localitiesData.map((loc) => prisma.locality.create({ data: loc }))
  );
  const locMap = new Map(createdLocalities.map((l) => [l.slug, l.id]));

  // 6. Seed Hyderabad Major Tech Landmarks
  const landmarksData = [
    { name: "Cyber Towers", slug: "cyber-towers", latitude: 17.4504, longitude: 78.3811, locSlug: "hitec-city" },
    { name: "Mindspace IT Park", slug: "mindspace-it-park", latitude: 17.4406, longitude: 78.3807, locSlug: "madhapur" },
    { name: "DLF Cyber City", slug: "dlf-cyber-city", latitude: 17.4489, longitude: 78.3562, locSlug: "gachibowli" },
    { name: "WaveRock Technology Park", slug: "waverock", latitude: 17.4184, longitude: 78.3424, locSlug: "financial-district" },
    { name: "T-Hub Phase 2", slug: "t-hub-2", latitude: 17.4473, longitude: 78.3756, locSlug: "madhapur" },
    { name: "IKEA Hyderabad", slug: "ikea-hyderabad", latitude: 17.4357, longitude: 78.3758, locSlug: "hitec-city" },
    { name: "JNTU Hyderabad Metro", slug: "jntu-metro", latitude: 17.4988, longitude: 78.3883, locSlug: "kukatpally" }
  ];

  for (const lm of landmarksData) {
    await prisma.landmark.create({
      data: {
        name: lm.name,
        slug: lm.slug,
        latitude: lm.latitude,
        longitude: lm.longitude,
        localityId: locMap.get(lm.locSlug)!
      }
    });
  }

  // 7. Seed Realistic Hyderabad PG Listings (including iconic Madhapur hubs)
  const pgRawList = [
    // Famous Madhapur & HITEC City PGs
    {
      title: "Live Well Luxury Coliving Madhapur",
      slug: "live-well-luxury-coliving-madhapur",
      description: "One of Madhapur's most popular co-living spaces on 100 Feet Road. Premium AC rooms, 300 Mbps WiFi, gaming lounge, 3-times buffet meals (North & South Indian), biometric security, and 24/7 power backup. 5 min walk to Durgam Cheruvu metro.",
      address: "100 Feet Road, Near Durgam Cheruvu Metro, Ayyappa Society, Madhapur, Hyderabad",
      locality: "madhapur",
      lat: 17.4478,
      lng: 78.3885,
      minRent: 10500,
      deposit: 15000,
      maintenance: 0,
      gender: GenderType.CO_LIVING,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "None (24/7 Biometric)",
      contact: "+919849019901",
      verified: true,
      singleRent: 18000,
      doubleRent: 12500,
      tripleRent: 10500,
      imageUrls: [
        "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      title: "Star Luxury Coliving Madhapur",
      slug: "star-luxury-coliving-madhapur",
      description: "Iconic Madhapur stay located in Kavuri Hills near D-Mart. Fully furnished AC rooms with attached washrooms, refrigerators, washing machines, and terrace cafeteria. Strict hygiene with daily room cleaning and RO drinking water.",
      address: "Plot 112, Kavuri Hills Phase 1, Near Madhapur Metro Station, Madhapur, Hyderabad",
      locality: "madhapur",
      lat: 17.4425,
      lng: 78.3942,
      minRent: 11000,
      deposit: 16000,
      maintenance: 300,
      gender: GenderType.CO_LIVING,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "None (Biometric)",
      contact: "+919849019902",
      verified: true,
      singleRent: 19000,
      doubleRent: 13000,
      tripleRent: 11000,
      imageUrls: [
        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      title: "KR Luxury Coliving & PG Madhapur",
      slug: "kr-luxury-coliving-pg-madhapur",
      description: "Top-rated Madhapur PG located in Silicon Valley behind Image Hospital. Walking distance to Mindspace and Inorbit. Features high water pressure plumbing, elevator lift, generator backup, CCTV, and delicious Andhra style home meals.",
      address: "Plot 88, VIP Hills, Silicon Valley, Behind Image Hospital, Madhapur, Hyderabad",
      locality: "madhapur",
      lat: 17.4495,
      lng: 78.3855,
      minRent: 9500,
      deposit: 12000,
      maintenance: 0,
      gender: GenderType.CO_LIVING,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "11:30 PM",
      contact: "+919849019903",
      verified: true,
      singleRent: 16500,
      doubleRent: 11500,
      tripleRent: 9500,
      imageUrls: [
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      title: "Zolo CyberNest Luxury Co-Living",
      slug: "zolo-cybernest-hitec-city",
      description: "Premium co-living space walking distance to Cyber Towers and Mindspace. High-speed 300 Mbps fiber, biometric security, air conditioning, daily chef-prepared buffet meals, and weekly housekeeping.",
      address: "Plot 42, Silicon Valley, Behind Image Hospital, Madhapur, Hyderabad",
      locality: "madhapur",
      lat: 17.4495,
      lng: 78.3865,
      minRent: 11500,
      deposit: 15000,
      maintenance: 500,
      gender: GenderType.CO_LIVING,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "None (24/7 Biometric)",
      contact: "+919849011101",
      verified: true,
      singleRent: 19500,
      doubleRent: 12500,
      tripleRent: 9500,
      imageUrls: [
        "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      title: "Sri Sai Balaji Executive PG for Men",
      slug: "sri-sai-balaji-pg-men-madhapur",
      description: "Spacious rooms with attached washrooms in Ayyappa Society. Delicious Andhra style meals 3 times a day. Very close to Inorbit Mall and Durgam Cheruvu metro.",
      address: "Street 8, Ayyappa Society, Near YSR Statue, Madhapur, Hyderabad",
      locality: "madhapur",
      lat: 17.4442,
      lng: 78.3892,
      minRent: 7500,
      deposit: 5000,
      maintenance: 0,
      gender: GenderType.MEN,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "11:00 PM",
      contact: "+919849022202",
      verified: true,
      singleRent: 14000,
      doubleRent: 9500,
      tripleRent: 7500,
      imageUrls: [
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      title: "Sree Lakshmi Deluxe Women's PG & Hostel",
      slug: "sree-lakshmi-womens-pg-hitec",
      description: "Safe, gated accommodation exclusively for working women and students in HITEC City. 24/7 female warden, biometric entry, CCTV on all floors, RO drinking water, and quiet study areas.",
      address: "H.No 2-34/1, Vittal Rao Nagar, HITEC City, Hyderabad",
      locality: "hitec-city",
      lat: 17.4522,
      lng: 78.3789,
      minRent: 8500,
      deposit: 8000,
      maintenance: 200,
      gender: GenderType.WOMEN,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "10:30 PM",
      contact: "+919849033303",
      verified: true,
      singleRent: 16000,
      doubleRent: 10500,
      tripleRent: 8500,
      imageUrls: [
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      title: "Stanza Living Boston House",
      slug: "stanza-living-boston-house-kondapur",
      description: "Modern professionally managed student & professional residence. Curated community events, gaming lounge, high speed wifi, housekeeping, app-based grievance management, and multi-cuisine meals.",
      address: "Near RTO Office, Raghavendra Colony, Kondapur, Hyderabad",
      locality: "kondapur",
      lat: 17.4645,
      lng: 78.3612,
      minRent: 12000,
      deposit: 20000,
      maintenance: 0,
      gender: GenderType.CO_LIVING,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "None",
      contact: "+919849044404",
      verified: true,
      singleRent: 21000,
      doubleRent: 14000,
      tripleRent: 11000,
      imageUrls: [
        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      title: "Venkat Sai Executive PG Gachibowli",
      slug: "venkat-sai-pg-gachibowli",
      description: "Located opposite DLF Cyber City. Ideal for Amazon, Microsoft, and Cognizant employees. 30 seconds walk to DLF street food street. High speed internet, hot water, AC rooms available.",
      address: "Street 4, Telecom Nagar, Gachibowli, Hyderabad",
      locality: "gachibowli",
      lat: 17.4448,
      lng: 78.3585,
      minRent: 7000,
      deposit: 6000,
      maintenance: 0,
      gender: GenderType.MEN,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "11:30 PM",
      contact: "+919849055505",
      verified: true,
      singleRent: 13500,
      doubleRent: 9000,
      tripleRent: 7000,
      imageUrls: [
        "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&w=800&q=80"
      ]
    },
    // Financial District & Nanakramguda
    {
      title: "WaveStay Premium Co-Living Financial District",
      slug: "wavestay-coliving-financial-district",
      description: "Walk to WaveRock, Apple, Google, and Continental Hospitals. Resort style co-living with gym, terrace lounge, high-speed fiber internet, and covered car parking.",
      address: "Nanakramguda Road, Behind ICICI Regional Hub, Financial District, Hyderabad",
      locality: "financial-district",
      lat: 17.4172,
      lng: 78.3415,
      minRent: 13500,
      deposit: 20000,
      maintenance: 1000,
      gender: GenderType.CO_LIVING,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "None",
      contact: "+919849066606",
      verified: true,
      singleRent: 24000,
      doubleRent: 15500,
      tripleRent: 12500,
      imageUrls: [
        "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80"
      ]
    },
    // Ameerpet & SR Nagar
    {
      title: "Hyderabad StudyHub Student PG Ameerpet",
      slug: "studyhub-student-pg-ameerpet",
      description: "Directly opposite Mythrivanam and near Ameerpet Metro interchange. Designed specifically for students attending software coaching. High speed study rooms, quiet hours, and North/South food.",
      address: "Dharam Karam Road, Beside Aditya Enclave, Ameerpet, Hyderabad",
      locality: "ameerpet",
      lat: 17.4385,
      lng: 78.4495,
      minRent: 5500,
      deposit: 3000,
      maintenance: 0,
      gender: GenderType.MEN,
      foodType: FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.SEMI_FURNISHED,
      curfew: "10:00 PM",
      contact: "+919849077707",
      verified: true,
      singleRent: 10000,
      doubleRent: 7500,
      tripleRent: 5500,
      imageUrls: [
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
      ]
    },
    // Kukatpally & KPHB
    {
      title: "KPHB Elite Stay for Working Women",
      slug: "kphb-elite-stay-women-kukatpally",
      description: "Prime location in KPHB Phase 3. 2 minutes walk to KPHB Colony metro station. Safe residential street with biometric entrance, pure vegetarian kitchen option, and power backup.",
      address: "Road No. 2, KPHB Colony Phase 3, Kukatpally, Hyderabad",
      locality: "kukatpally",
      lat: 17.4912,
      lng: 78.3965,
      minRent: 6500,
      deposit: 5000,
      maintenance: 0,
      gender: GenderType.WOMEN,
      foodType: FoodType.VEG,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: "10:00 PM",
      contact: "+919849088808",
      verified: true,
      singleRent: 12000,
      doubleRent: 8500,
      tripleRent: 6500,
      imageUrls: [
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"
      ]
    }
  ];

  // Generate 34 additional realistic Hyderabad listings procedurally to reach 42 total
  const localityList = ["madhapur", "gachibowli", "kondapur", "hitec-city", "financial-district", "ameerpet", "kukatpally", "banjara-hills"];
  const prefixes = ["Sri Krishna", "Sai Teja", "Royal Residency", "Comfort Nest", "Bliss Co-Living", "Urban Pod", "Swastik Executive", "Manikanta", "Suraksha Ladies", "Cyber View"];
  const genders = [GenderType.MEN, GenderType.WOMEN, GenderType.CO_LIVING];

  const roomPhotoPool = [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
  ];

  for (let i = 1; i <= 34; i++) {
    const locSlug = localityList[i % localityList.length]!;
    const locObj = localitiesData.find((l) => l.slug === locSlug)!;
    const gender = genders[i % genders.length]!;
    const prefix = prefixes[i % prefixes.length]!;
    const latDelta = (Math.random() - 0.5) * 0.02;
    const lngDelta = (Math.random() - 0.5) * 0.02;
    const baseRent = Math.floor(6500 + Math.random() * 6000);
    const primaryImg = roomPhotoPool[i % roomPhotoPool.length]!;
    const secondaryImg = roomPhotoPool[(i + 5) % roomPhotoPool.length]!;

    pgRawList.push({
      title: `${prefix} ${gender === GenderType.WOMEN ? "Women's PG" : gender === GenderType.MEN ? "Gents PG" : "Co-Living"} ${i}`,
      slug: `${prefix.toLowerCase().replace(/\s+/g, "-")}-${locSlug}-${i}`,
      description: `Well-maintained PG in prime ${locObj.name}. Features 3-times tasty home meals, high-speed WiFi, hot water, washing machines, and 24/7 security.`,
      address: `Road No. ${1 + (i % 12)}, Sector ${1 + (i % 4)}, ${locObj.name}, Hyderabad`,
      locality: locSlug,
      lat: Number((locObj.latitude + latDelta).toFixed(4)),
      lng: Number((locObj.longitude + lngDelta).toFixed(4)),
      minRent: baseRent,
      deposit: baseRent * 1.5,
      maintenance: i % 2 === 0 ? 300 : 0,
      gender: gender,
      foodType: i % 3 === 0 ? FoodType.VEG : FoodType.BOTH,
      isFoodIncluded: true,
      furnishedStatus: FurnishedStatus.FULLY_FURNISHED,
      curfew: gender === GenderType.WOMEN ? "10:00 PM" : i % 2 === 0 ? "11:00 PM" : "None",
      contact: `+9198490${10000 + i}`,
      verified: i % 3 !== 0,
      singleRent: Math.round(baseRent * 1.8),
      doubleRent: Math.round(baseRent * 1.3),
      tripleRent: baseRent,
      imageUrls: [primaryImg, secondaryImg]
    });
  }

  console.log(`🏠 Seeding ${pgRawList.length} Hyderabad PG listings...`);

  for (const pg of pgRawList) {
    const locId = locMap.get(pg.locality);
    if (!locId) continue;

    const createdPg = await prisma.pGListing.create({
      data: {
        title: pg.title,
        slug: pg.slug,
        description: pg.description,
        address: pg.address,
        latitude: pg.lat,
        longitude: pg.lng,
        minRent: pg.minRent,
        depositAmount: pg.deposit,
        maintenanceFee: pg.maintenance,
        gender: pg.gender,
        foodType: pg.foodType,
        isFoodIncluded: pg.isFoodIncluded,
        furnishedStatus: pg.furnishedStatus,
        curfewTime: pg.curfew,
        contactPhone: pg.contact,
        isVerified: pg.verified,
        localityId: locId,
        ownerId: demoOwner.id
      }
    });

    // Add Room Options (Single, Double, Triple)
    await prisma.roomOption.createMany({
      data: [
        {
          pgId: createdPg.id,
          sharingType: SharingType.SINGLE,
          rentPerMonth: pg.singleRent,
          totalBeds: 5,
          availableBeds: 2
        },
        {
          pgId: createdPg.id,
          sharingType: SharingType.DOUBLE,
          rentPerMonth: pg.doubleRent,
          totalBeds: 12,
          availableBeds: 4
        },
        {
          pgId: createdPg.id,
          sharingType: SharingType.TRIPLE,
          rentPerMonth: pg.tripleRent,
          totalBeds: 18,
          availableBeds: 6
        }
      ]
    });

    // Attach 5-7 random amenities
    const selectedAmenities = amenities.slice(0, 6 + (Math.floor(Math.random() * 5)));
    for (const am of selectedAmenities) {
      await prisma.pGAmenity.create({
        data: {
          pgId: createdPg.id,
          amenityId: am.id
        }
      });
    }

    // Attach Images
    for (let idx = 0; idx < pg.imageUrls.length; idx++) {
      await prisma.pGImage.create({
        data: {
          pgId: createdPg.id,
          url: pg.imageUrls[idx]!,
          altText: `${pg.title} Room Image`,
          isCover: idx === 0,
          displayOrder: idx
        }
      });
    }

    // Add realistic reviews
    await prisma.review.create({
      data: {
        pgId: createdPg.id,
        userId: demoSeeker.id,
        rating: 4,
        comment: "Good food, fast wifi, and owner is cooperative with deposit return."
      }
    });
  }

  // 8. Seed 15 Realistic Buddy Profiles
  console.log("🤝 Seeding 15 Hyderabad Local Buddies...");

  const buddyDefs = [
    {
      fullName: "Rahul Varma",
      email: "rahul.varma@gmail.com",
      phone: "+919988776601",
      bio: "Software Engineer at Google Hyderabad. Living in Madhapur & HITEC City for 5 years. I know which lanes have water logging, noise issues, and great Andhra mess food.",
      languages: ["Telugu", "Hindi", "English"],
      localities: ["Madhapur", "HITEC City", "Kondapur"],
      centerLat: 17.4486,
      centerLng: 78.3908,
      hourlyFee: 149,
      tier: VerificationTier.ID_VERIFIED,
      rating: 4.9,
      reviews: 24,
      response: 10
    },
    {
      fullName: "Pooja Hegde",
      email: "pooja.hegde@gmail.com",
      phone: "+919988776602",
      bio: "IIIT Hyderabad M.Tech alumna, currently at Microsoft. Specialist in safe women's PGs, quiet study environments, and zero-brokerage direct owner contacts in Gachibowli.",
      languages: ["English", "Hindi", "Kannada", "Telugu"],
      localities: ["Gachibowli", "Financial District"],
      centerLat: 17.4401,
      centerLng: 78.3489,
      hourlyFee: 199,
      tier: VerificationTier.ID_VERIFIED,
      rating: 5.0,
      reviews: 38,
      response: 5
    },
    {
      fullName: "Syed Zeeshan",
      email: "syed.zeeshan@gmail.com",
      phone: "+919988776603",
      bio: "Lifelong Hyderabadi. I can help newcomers find affordable student PGs near Ameerpet and SR Nagar coaching hubs with authentic food and no hidden electricity bills.",
      languages: ["Urdu", "Hindi", "Telugu", "English"],
      localities: ["Ameerpet", "Begumpet", "Mehdipatnam"],
      centerLat: 17.4375,
      centerLng: 78.4482,
      hourlyFee: 99,
      tier: VerificationTier.PHONE,
      rating: 4.8,
      reviews: 19,
      response: 15
    },
    {
      fullName: "Karthik Raja",
      email: "karthik.raja@gmail.com",
      phone: "+919988776604",
      bio: "Moved from Chennai 3 years ago, working in Financial District. Can guide Tamil and South Indian newcomers on South-style food, ORR transit, and peaceful Kondapur localities.",
      languages: ["Tamil", "English", "Telugu"],
      localities: ["Kondapur", "Financial District", "Gachibowli"],
      centerLat: 17.4699,
      centerLng: 78.3578,
      hourlyFee: 149,
      tier: VerificationTier.ID_VERIFIED,
      rating: 4.9,
      reviews: 14,
      response: 20
    },
    {
      fullName: "Sneha Reddy",
      email: "sneha.reddy@gmail.com",
      phone: "+919988776605",
      bio: "Architect working in Jubilee Hills. Passionate about well-ventilated, mold-free rooms with good sunlight. Can accompany you on weekend visits in Madhapur & Banjara Hills.",
      languages: ["Telugu", "English", "Hindi"],
      localities: ["Banjara Hills", "Madhapur"],
      centerLat: 17.4156,
      centerLng: 78.4357,
      hourlyFee: 249,
      tier: VerificationTier.ID_VERIFIED,
      rating: 5.0,
      reviews: 31,
      response: 12
    }
  ];

  // Add 10 more buddies procedurally
  const extraBuddyNames = [
    "Vikram Rao", "Deepak Nair", "Ankit Tiwari", "Manish Joshi", "Shreya Sen",
    "Sai Kumar", "Neha Choudhury", "Arjun Patel", "Bhavna Mishra", "Pranav Deshmukh"
  ];

  for (let b = 0; b < extraBuddyNames.length; b++) {
    const name = extraBuddyNames[b]!;
    const locSlug = localityList[b % localityList.length]!;
    const locObj = localitiesData.find((l) => l.slug === locSlug)!;
    buddyDefs.push({
      fullName: name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@thikana.local`,
      phone: `+91998877${6610 + b}`,
      bio: `Working professional living in ${locObj.name}. Happy to help you verify landlord claims, check water pressure, and negotiate fair deposits.`,
      languages: ["Telugu", "Hindi", "English"],
      localities: [locObj.name],
      centerLat: locObj.latitude,
      centerLng: locObj.longitude,
      hourlyFee: 99 + (b % 3) * 50,
      tier: b % 2 === 0 ? VerificationTier.ID_VERIFIED : VerificationTier.PHONE,
      rating: Number((4.6 + Math.random() * 0.4).toFixed(1)),
      reviews: 8 + b * 2,
      response: 10 + (b % 4) * 5
    });
  }

  for (const buddy of buddyDefs) {
    const user = await prisma.user.create({
      data: {
        email: buddy.email,
        passwordHash: defaultPasswordHash,
        fullName: buddy.fullName,
        phone: buddy.phone,
        phoneVerified: true,
        roles: [Role.USER, Role.BUDDY]
      }
    });

    await prisma.buddyProfile.create({
      data: {
        userId: user.id,
        bio: buddy.bio,
        languages: buddy.languages,
        serviceLocalities: buddy.localities,
        centerLat: buddy.centerLat,
        centerLng: buddy.centerLng,
        radiusKm: 6.0,
        hourlyFee: buddy.hourlyFee,
        isDeclaredNotBroker: true,
        verificationTier: buddy.tier,
        rating: buddy.rating,
        totalReviews: buddy.reviews,
        avgResponseMinutes: buddy.response,
        availableDays: ["SAT", "SUN", "FRI"]
      }
    });
  }

  console.log("✅ Seed completed successfully! All 42 PGs and 15 Buddies ready.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
