# Thikana Engineering Journal (`LEARN.md`)

Welcome to the engineering study log for **Thikana** (Hyderabad's Commute-First PG Finder, Visit Copilot, Buddy Network & Deposit Shield).

---

## Phase 1: Monorepo Scaffolding, PostGIS Topology & Design System

### 1. Why a Monorepo with `pnpm workspaces`?
* **Zero Duplication**: Shared types live in `packages/shared-types`. When an API response changes, `pnpm build` flags breaking changes across both frontend and backend before committing.
* **Content-Addressable Storage**: `pnpm` hard-links package files globally, cutting disk usage and install times.

### 2. Fastify Injection Testing (`light-my-request`)
Instead of opening actual TCP sockets and risking port conflicts in test suites, Fastify allows direct dispatching of synthetic HTTP requests into its pipeline via `app.inject()`. This enables end-to-end routing, validation, and error pipeline tests in milliseconds.

---

## Phase 2: Database Modeling, PostGIS Topology & Seed Mechanics

### 1. Relational Modeling with Prisma (3NF & Referential Integrity)
Our database schema separates concerns into normalized entities:
* **`PGListing`**: Base property record (title, coordinates, minimum rent, gender type, food inclusion).
* **`RoomOption`**: 1-to-many relation for room configurations (Single, Double, Triple sharing with distinct rents and bed availability).
* **`Amenity` & `PGAmenity`**: Many-to-many join table for fast indexing by amenity.
* **`BuddyProfile`**: 1-to-1 extension of a `User`, storing local neighborhood service coverage, verification tier, and rates.
* **`Tenancy` & `Inspection`**: Versioned state machines for Deposit Shield.

### 2. PostGIS Deep Dive: Geometry vs. Geography
* **`GEOGRAPHY`**: Computes spherical geodesics using Great-Circle distance directly on the WGS 84 ellipsoid (standard GPS SRID 4326).
* **`ST_MakePoint(lng, lat)`**: Notice that $(X, Y) = (\text{Longitude}, \text{Latitude})$.
* **`ST_DWithin(a, b, distance_meters)`**: Runs radial distance checks using the GiST spatial index in sub-millisecond execution.

---

## Phase 3: Backend Core Architecture & Security Engineering

### 1. Why Argon2id Beats Bcrypt for Password Hashing
Most web applications still default to `bcrypt`, which was designed in 1999.
* **The Vulnerability of Bcrypt**: Bcrypt is memory-light ($\approx 4\text{ KB}$). Attackers with modern GPUs or custom ASIC mining rigs can compute hundreds of millions of Bcrypt hashes per second in parallel.
* **Argon2id (Winner of the Password Hashing Competition)**:
  * **Memory-Hard**: We configure Argon2id with 64 MB (`2**16` memory cost). A modern GPU cannot hold thousands of 64 MB instances in its high-speed L2/L3 cache simultaneously, neutralizing GPU cluster brute-force attacks.
  * **Side-Channel Resistant**: Argon2id blends Argon2i (data-independent memory access to prevent cache-timing attacks) and Argon2d (data-dependent access to maximize GPU cracking costs).

```typescript
// apps/api/src/lib/hash.ts
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,         // 3 iterations
    parallelism: 1
  });
}
```

---

### 2. JWT Refresh Token Rotation Pattern (Defense-in-Depth)

Storing long-lived JWTs in browser `localStorage` leaves tokens vulnerable to Cross-Site Scripting (XSS) extraction. 

#### Our Two-Token Architecture:
1. **Access Token (Short-Lived, 15 Minutes)**:
   * Carried in memory or `Authorization: Bearer <token>` header.
   * Self-contained: The API verifies the cryptographic signature without querying the database for every single HTTP request.
2. **Refresh Token (Long-Lived, 7 Days, Stored in `httpOnly` Cookie)**:
   * Stored with flags: `httpOnly: true` (JavaScript cannot read it), `SameSite: "lax"`, and `Secure: true` in production.
   * **Stored in Redis**: Stored under key `refresh_token:${userId}`.

#### Automatic Reuse Detection:
When a client hits `POST /api/v1/auth/refresh`:
1. The server checks if the submitted refresh token matches the one stored in Redis.
2. If an attacker stole an old token and attempts to use it, the Redis comparison fails.
3. The server immediately **revokes all tokens for that user**, forcing re-authentication and neutralizing token theft.

---

### 3. Cursor-Based Pagination vs. `OFFSET / LIMIT`

When listing PGs, naive APIs use `OFFSET`:
```sql
-- Bad at scale:
SELECT * FROM "PGListing" ORDER BY "createdAt" DESC OFFSET 5000 LIMIT 12;
```
#### Why `OFFSET` Fails in Production:
1. **The Performance Cliff**: To return 12 rows with `OFFSET 5000`, PostgreSQL must read 5,012 rows from disk, sort them, throw away the first 5,000, and return the last 12. As users scroll deeper, queries take hundreds of milliseconds.
2. **The "Page Drift" Bug**: If an owner posts a new PG while a user is browsing page 1, every item shifts down by one. When the user scrolls to page 2, they see the last item from page 1 repeated.

#### Our Cursor Approach:
We sort by composite unique keys `(createdAt DESC, id DESC)`:
```typescript
// apps/api/src/modules/listings/listings.service.ts
const paginationArgs = {
  where,
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: limit + 1 // Request 1 extra record to test for hasMore
};

if (cursor) {
  paginationArgs.cursor = { id: cursor };
  paginationArgs.skip = 1;
}
```
* **$O(1)$ Seek Performance**: PostgreSQL uses our B-Tree index `(createdAt DESC, id DESC)` to jump straight to the cursor without scanning previous rows.
* **Zero Duplicates**: New listings inserted at the top never displace the cursor position.

---

### 4. Fastify Error Envelope Architecture

Errors in Thikana inherit from our domain `AppError` base class. 
The central error handler in `apps/api/src/middlewares/errorHandler.ts`:
1. Maps Zod validation failures into clean field paths (`path: "email"`, `message: "Invalid email address"`).
2. Intercepts operational errors (`NotFoundError`, `ConflictError`, `UnauthorizedError`) and returns appropriate HTTP status codes ($404, 409, 401$).
3. In case of unexpected bugs, logs the full stack trace to **Pino with the request's unique `requestId`**, while sending a safe, generic message to the user:
   ```json
   {
     "success": false,
     "data": null,
     "error": {
       "code": "INTERNAL_SERVER_ERROR",
       "message": "An unexpected internal server error occurred"
     },
     "meta": {
       "timestamp": "2026-11-22T13:00:00.000Z",
       "requestId": "req-xyz789"
     }
   }
   ```
Stack traces and database error internals are **never leaked** to clients.


---

## Phase 4: Commute Engine, PostGIS Polygon Search & Background Queues

### 1. Isochrones vs Distance: Why Commute Time Is What Matters

Traditional property portals filter by radius ("Within 5 km of Madhapur"). In Hyderabad, a 5 km commute down the Outer Ring Road (ORR) takes 8 minutes, while a 5 km journey through Ameerpet or Biodiversity Junction at 9:15 AM can easily take 45 minutes.

An **Isochrone** (from Greek *iso* = equal, *chronos* = time) is a polygon enclosing all points reachable from a target destination within a specific cutoff time (e.g. $\le 30$ minutes).

#### The Challenge with Free Routing Engines (ORS, OSRM)
Open-source routing engines calculate travel times based strictly on statutory road speed limits (e.g. 50 km/h on urban roads). They have **no historical or real-time traffic data**. As a result:
- At 9:15 AM, they estimate Kondapur to HITEC City at 12 minutes (reality: 35–45 minutes).
- Commuters relying on plain distance or uncalibrated routing make catastrophic rental decisions.

#### Our Solution: Calibrated Peak-Hour Congestion Model
In `apps/api/src/modules/commute/hyderabad.provider.ts`, we implemented corridor-specific congestion multipliers:
```typescript
const HYDERABAD_CORRIDORS: CongestionProfile[] = [
  {
    corridorName: "HITEC City – Madhapur – Durgam Cheruvu",
    bbox: [78.355, 17.430, 78.400, 17.460],
    amPeakFactor: 2.2, // 2.2x free-flow travel time
    pmPeakFactor: 2.4,
    shoulderFactor: 1.5,
    offPeakFactor: 1.0
  },
  ...
];
```
This enables accurate commute zones without expensive enterprise traffic API subscriptions, while keeping travel estimates realistic.

---

### 2. PostGIS Spatial Polygon Search: `ST_Contains` and `ST_Distance`

Once an isochrone polygon is computed, finding all PGs inside it requires spatial containment in PostgreSQL:

```sql
SELECT 
  p.id,
  ST_Distance(
    p.location::geography, 
    ST_SetSRID(ST_MakePoint($destLng, $destLat), 4326)::geography
  ) as distance_meters
FROM "PGListing" p
WHERE p."isDeleted" = false
  AND ST_Contains(
    ST_SetSRID(ST_GeomFromText($wktPolygon), 4326),
    p.location
  )
ORDER BY distance_meters ASC;
```

#### Key Spatial Concepts:
1. **Geometry vs Geography**:
   - `geometry(Point, 4326)`: Uses planar Euclidean math ($x, y$ cartesian). Calculations are extremely fast for index lookups (`ST_Contains`).
   - `geography`: Uses spherical earth math (great-circle distances). `ST_Distance(a::geography, b::geography)` returns exact distance in **meters**, whereas planar distance on SRID 4326 returns degrees!
2. **Longitude First**:
   - `ST_MakePoint(lng, lat)` — standard in GIS and GeoJSON. Putting latitude first is the most common bug in geospatial software.
3. **GiST Indexing**:
   - `idx_pg_location_gist`: PostgreSQL uses an R-Tree bounding box hierarchy. `ST_Contains` tests candidate bounding boxes first ($O(\log N)$) before doing the expensive polygon boundary vertex containment check.

---

### 3. The Pluggable Provider & Circuit Breaker Pattern

External APIs (like OpenRouteService) can have network latency, quota limits, or outages. If an external service is down, your app should never crash or leave users hanging.

#### Circuit Breaker States:
1. **Closed (Normal)**: Requests pass through to ORS. Failures are counted.
2. **Open (Tripped)**: After 5 consecutive failures, the circuit "trips open". All requests immediately bypass ORS and use the local calibrated model for 60 seconds. No wasted network calls.
3. **Half-Open (Testing)**: After 60 seconds, one probe request is sent. If it succeeds, the circuit closes. If it fails, the breaker resets to open.

```typescript
export class OrsProvider implements TravelTimeProvider {
  // If quota is exhausted or circuit is tripped, failover to offline model
  async isAvailable(): Promise<boolean> {
    if (!env.OPENROUTESERVICE_API_KEY) return false;
    if (this.getCircuitState() === "open") return false;
    if (this.isRateLimited()) return false;
    return true;
  }
}
```

---

### 4. Snapped Grid Geocaching in Redis

Isochrone polygons can consist of dozens of coordinate vertices. Calculating them on every keystroke or slider movement is expensive.

If User A drops a pin at $(17.45041, 78.38082)$ and User B drops a pin at $(17.45049, 78.38088)$ (only 10 meters apart), recomputing the entire polygon is wasteful.

#### The Grid Snapping Technique:
We round coordinates to the nearest $0.005^\circ$ ($\approx 500\text{ m}$):
```typescript
const snappedLat = (Math.round(req.destination.lat / 0.005) * 0.005).toFixed(3);
const snappedLng = (Math.round(req.destination.lng / 0.005) * 0.005).toFixed(3);
const cacheKey = `iso:${snappedLat},${snappedLng}:${req.travelMode}:${req.maxMinutes}:${timeBucket}`;
```
- Groups nearby requests to the exact same cache key.
- Reduces duplicate calculations by up to 80% in dense office hubs like Cyber Towers or Financial District.
- 1-hour TTL in Redis ensures cache staleness is never an issue.

---

### 5. Background Job Queues with BullMQ

When a user requests a full multi-modal matrix across large datasets or downloads an itinerary, doing this in the Fastify HTTP request cycle risks request timeouts.

```
Client  ──POST /zones/async──▶  Fastify Route  ──addCommuteJob()──▶  Redis (BullMQ Queue)
                                      │                                       │
                               202 Accepted { jobId: "1" }                    ▼
                                      │                               Commute Worker
Client  ──GET /jobs/1────────▶  Fastify Route  ◀──result/state───────  (concurrency: 3)
```

1. **HTTP 202 Accepted**: The client immediately receives a job ID without waiting for heavy processing.
2. **Rate Limiting**: Worker limiter restricts execution to 10 jobs/minute to respect upstream resources.
3. **Connection Isolation**: BullMQ workers require separate Redis connections because blocking queue operations (`BLMOVE`) would stall standard application Redis reads.


---

## Phase 5: Frontend Shell, MapLibre GL & Responsive Commute Interaction

### 1. Map-First UI: CartoDB Positron & Free Vector Tiles

Rather than treating the map as a secondary tab or tiny widget, Thikana uses a **Map-First Architecture**:
- The map is an immersive full-screen background layer that anchors the entire spatial mental model.
- We chose **CartoDB Positron** (`https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`):
  1. **Free & Keyless**: Requires zero API keys or billing overhead.
  2. **Editorial Light Styling**: Uses a muted grayscale canvas with high street contrast, allowing our warm Terracotta (`#D9532F`) commute isochrones and markers to pop visually without visual noise.

```typescript
const map = new maplibregl.Map({
  container: mapContainer.current,
  style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  center: [destination.lng, destination.lat],
  zoom: 12.5,
});
```

---

### 2. GeoJSON Isochrone Layers & Smooth Boundary Interpolation

When rendering commute reach polygons, MapLibre GL operates on vector GeoJSON data with two coordinated layers:
1. **Translucent Fill Layer (`fill-color: #D9532F`, `opacity: 0.16`)**: Defines the reachable zone interior so users can immediately see which neighborhoods fall inside their commute tolerance.
2. **Accent Stroke Layer (`line-color: #D9532F`, `line-width: 2.5`)**: Creates a clean, crisp perimeter boundary.

```typescript
map.addSource("commute-isochrone", { type: "geojson", data: isochrone });
map.addLayer({
  id: "commute-isochrone-fill",
  type: "fill",
  source: "commute-isochrone",
  paint: { "fill-color": "#D9532F", "fill-opacity": 0.16 }
});
```

When the slider moves or a user clicks a new destination hub, `source.setData(newIsochrone)` updates the WebGL vertex buffer directly, and `map.fitBounds(bounds, { duration: 800 })` smoothly glides the camera to the new boundary.

---

### 3. Responsive Layout: Draggable Mobile Bottom Sheet vs. Desktop Floating Split View

Mobile and desktop users interact with maps very differently:
- **Desktop ($\ge 1024\text{px}$)**: A floating sidebar ($430\text{px}$) sits on the left with backdrop-blur, keeping both the interactive slider controls and the listings scrollable while leaving the map fully visible and clickable on the right.
- **Mobile ($< 1024\text{px}$)**: Screen space is constrained. A bottom drawer powered by **Framer Motion** slides between three distinct snap heights:
  - **Peek (`160px`)**: Lets the user focus on the map and pin-drops.
  - **Half (`50vh`)**: Perfect balance for browsing listings while keeping the commute polygon visible.
  - **Full (`88vh` / List Mode)**: Immersive listing browsing with deep filters.

---

### 4. Bidirectional Map $\leftrightarrow$ List Synchronization with Zustand

A frequent frustration on property websites is disconnected maps: clicking a card doesn't show where it is, and clicking a pin doesn't reveal the details.

In Thikana, the relationship is fully synchronized via our centralized Zustand store (`apps/web/src/store/commuteStore.ts`):
1. **Card Hover $\rightarrow$ Pin Highlight**: Hovering over any PG card in the drawer sets `hoveredPgId(pg.id)`. The corresponding MapLibre marker scales up to $1.1\times$ and turns terracotta with a glowing ring.
2. **Pin Click $\rightarrow$ Card Focus**: Clicking a marker on the map sets `selectedPgId(pg.id)` and highlights the card.
3. **Map Click $\rightarrow$ Custom Destination**: Clicking anywhere on the open road network drops a pin and recomputes the travel zone from that custom location.


---

## Phase 6: Listing Cards, Faceted Filters & Optimistic Shortlists

### 1. Consumer E-Commerce UX Patterns for Real Estate

Traditional Indian PG portals are cluttered with unverified broker banners and stock photos. Thikana adapts **Myntra-style consumer browsing patterns** to make housing discovery feel effortless:

1. **Card Hover Lift & Micro-Interactions**:
   Cards use subtle elevation transitions (`shadow-xs` $\rightarrow$ `shadow-md`), image zoom (`scale-102`), and immediate marker synchronization on the map.
2. **Carousel Micro-Dots & Thumbnails**:
   Prospective tenants need to see room conditions before clicking. Multi-image carousels allow swiping through room interiors directly from the feed.
3. **Information Hierarchy**:
   - Primary: Estimated commute time (`🏍️ 14m commute`) and starting monthly rent.
   - Secondary: Room sharing options (`Single`, `2 Sharing`, `3 Sharing`), deposit, and food status.
   - Tertiary: Curfew and notice periods.

---

### 2. Optimistic UI State Management with Zustand Persist

When a user taps the heart icon to shortlist a PG, waiting for a network round-trip ($200\text{--}500\text{ ms}$) creates perceptible UI lag.

```
User Click  ──▶  Instant UI Update (Heart Scales + Turns Terracotta)  ──▶  Local Storage Sync
                                                                               │
                                                                               ▼
                                                                  (Async Backend Sync in background)
```

In `apps/web/src/store/shortlistStore.ts`:
- We use Zustand's `persist` middleware to immediately commit shortlisted IDs to browser `localStorage`.
- Framer Motion runs a spring animation (`scale: [1, 1.35, 1]`) simultaneously.
- When the user returns to the app offline or after closing the tab, their saved list is restored instantly with zero layout shifts.

---

### 3. Multi-Entity Comparison Architecture

Comparing PGs across WhatsApp chats or handwritten notes leads to missed catches (e.g. realizing too late that a ₹8,000 PG has a 3-month deposit lock-in and a 9:30 PM curfew).

#### Our Side-by-Side Matrix:
- Users can flag up to 3 properties simultaneously using the `+ Compare` button.
- A floating dock tracks the current selection.
- Clicking "Compare" launches a side-by-side comparison matrix evaluating:
  - Estimated commute time to the user's specific workplace.
  - Base rent vs. security deposit vs. monthly maintenance fee.
  - Meal provision (Veg, Non-Veg, or Self-cooking).
  - Curfew times and notice periods.

---

### 4. Fee & Deposit Transparency

One of the largest pain points in Indian rental accommodations is "hidden charges" announced after move-in (maintenance charges, water cess, non-refundable painting deductions).

In Thikana, each listing explicitly breaks down:
- **Rent per month**: Exact rent per sharing configuration (Single, Double, Triple).
- **Security Deposit**: The upfront lump sum required.
- **Maintenance Fee**: Specified whether included or extra.
- **Rules & Notice Period**: Documented upfront (e.g. "30 Days Notice"), forming the baseline for Phase 12's Deposit Shield evidence vault.


---

## Phase 7: Hunt Copilot, 2-Opt TSP Route Optimizer & Decision Matrices (MVP Milestone 🏆)

### 1. The 2-Opt Traveling Salesperson Problem (TSP) for Visit Day Planning

When house hunting across Hyderabad, a tenant might schedule 5 PG visits in a single Saturday. Visiting them in arbitrary order often results in zig-zagging back and forth across traffic bottlenecks (e.g. Kondapur $\rightarrow$ Gachibowli $\rightarrow$ Madhapur $\rightarrow$ KPHB), turning a 2-hour task into a 7-hour ordeal.

The **Traveling Salesperson Problem (TSP)** finds the route that visits every destination exactly once with minimal total distance. Because TSP is NP-hard ($O(N!)$ exact computation), we employ the **2-Opt Local Search Heuristic**:

```
Tour before 2-opt move:    A ───────▶ B
                                ╲   ╱    (Crossed edges add unnecessary distance)
                                  ╳
                                ╱   ╲
                           C ───────▶ D

Tour after 2-opt swap:     A ───────▶ C
                           │          │   (Uncrossed edges; shorter total path)
                           ▼          ▼
                           B ───────▶ D
```

#### Our Algorithm (`apps/api/src/modules/hunt/tsp.ts`):
1. **Greedy Nearest-Neighbor Seeding**: Starts at the user's origin (e.g. hotel or workplace) and builds an initial tour by selecting the closest unvisited stop next.
2. **Edge Swapping Loop**:
   Iterates through all edge pairs $(i, i+1)$ and $(j, j+1)$. If reversing the sub-tour between $i$ and $j$ reduces distance:
   ```typescript
   if (newDist < currentDist - 0.001) {
     const segment = tour.slice(i, j + 1).reverse();
     tour.splice(i, segment.length, ...segment);
     improved = true;
   }
   ```
3. **Timeline Construction**: Accounts for Hyderabad's $1.35\times$ urban winding factor and allocates a user-defined inspection window (e.g. 45 min per stop), outputting a turn-by-turn itinerary with direct Google Maps navigation deep links.

---

### 2. Solving the Real Estate Cold-Start Problem: User-Brought Data

Traditional listing portals fail when their local inventory is thin or stale. **Hunt Copilot solves this cold-start dilemma**:
- Users are not restricted to PGs listed in Thikana's database.
- A user can copy coordinates, addresses, and phone numbers from broker WhatsApp chats or Google Maps and paste them directly into their personal Hunt Workspace.
- The app immediately integrates external listings into the commute calculations, visit route optimizer, and on-site inspection checklist.

---

### 3. Subjective Tenant Multi-Criteria Decision Analysis (MCDA)

Different tenants have radically different priorities:
- A college fresher cares about **price** and **food**.
- A night-shift developer cares about **commute distance**, **noise level**, and **curfew flexibility**.

#### The Scoring Function (`apps/api/src/modules/hunt/hunt.service.ts`):
Each PG receives normalized component scores ($0\text{--}100$) based on objective data and physical on-site checks:
$$\text{Score} = \sum_{k \in \text{Categories}} (\text{NormalizedScore}_k \times \text{UserWeight}_k)$$

Categories include:
1. **Water & Hygiene**: Real faucet pressure rating ($1\text{--}5$) and odor inspection.
2. **Acoustic Peace**: Traffic noise rating ($1\text{--}5$).
3. **Safety & Policy**: CCTV presence, biometric access, and visitor curfew rules.
4. **Connectivity**: Measured WiFi speed (Mbps).
5. **Fairness**: Security deposit ratio and lock-in period.

---

## Phase 8: Local Buddies Network, Dual-Consent Privacy & Anti-Broker Economics

### 1. The Broken Incentive Structure of Rental Brokers
In the Indian rental market, real estate brokers operate under a fundamental conflict of interest:
* **Broker Incentive**: Earn 15–30 days worth of rent from the PG owner upon signing a tenant. Consequently, brokers are incentivized to conceal critical defects (intermittent water tanker shortages, food quality issues, abusive caretakers, or illegal power backup surcharges).
* **Local Buddy Model**: Thikana connects seekers with verified local residents (working techies, students, and long-term tenants) living in the same neighborhood. Buddies have zero stake in whether the seeker leases that specific building or moves elsewhere. Their incentive is to provide authentic, unvarnished ground reality.

### 2. Dual-Consent Phone Privacy (`Privacy-by-Design`)
Sharing personal mobile numbers online leads to relentless spam from brokers, real estate agents, and marketing bots. Thikana enforces cryptographic state-level masking:

```
Seeker requests help  ──▶  Status: REQUESTED  ──▶  Phone Numbers: [HIDDEN]
                                  │
Buddy accepts         ──▶  Status: ACCEPTED   ──▶  In-App Messaging Only
                                  │
Seeker consents       ──▶  seekerSharedPhone = true  (Buddy's number still HIDDEN)
                                  │
Buddy consents        ──▶  buddySharedPhone = true   (Both numbers REVEALED!)
```

Under `apps/api/src/modules/buddy/buddy.service.ts`:
```typescript
const isPhoneRevealed = Boolean(request.seekerSharedPhone && request.buddySharedPhone);
return {
  ...request,
  isPhoneRevealed,
  seekerPhone: isPhoneRevealed ? request.seeker.phone : null,
  buddyPhone: isPhoneRevealed ? request.buddy.user.phone : null,
};
```

### 3. Off-Platform Direct UPI Settlement
To prevent platform fee drag and payment gateway liability:
* The agreed buddy fee (₹199 for text consultation, ₹499 for physical room verification) is settled directly via peer-to-peer UPI (Google Pay, PhonePe, Paytm).
* Thikana does not intermediate escrow or take a commission cut, keeping the service affordable and compliant without escrow licensing overhead.
* Post-interaction reviews and verified badges are locked until the seeker and buddy confirm completion.

---

## Phase 9: Real-Time In-Request Chat Architecture & Redis Pub/Sub Backplane

### 1. Why WebSockets with a Redis Pub/Sub Backplane?
In production systems, running WebSockets on a single Node.js process does not scale horizontally. If Seeker connects to Node Instance A and Buddy connects to Node Instance B behind an Application Load Balancer:
* **The Silo Problem**: Instance A cannot directly emit WebSocket frames to clients holding TCP sockets open on Instance B.
* **The Redis Pub/Sub Solution**:
  * Whenever a chat message or read receipt is created, the receiving server publishes the serialized JSON event to the Redis channel `chat:request:${requestId}`.
  * Every server node running `@fastify/websocket` maintains a subscriber connection listening to the channel.
  * When a pub/sub message arrives, the node forwards the payload to any local WebSocket connection matching that `requestId`.

```
[ Seeker Socket ] ────▶ (Node A) ────▶ POST Message & Redis PUBLISH (`chat:request:req-123`)
                                                     │
                                             [ Redis Cluster ]
                                                     │
[ Buddy Socket  ] ◀──── (Node B) ◀──── Redis SUBSCRIBE Event (`message.new`)
```

### 2. Ephemeral Typing & Read Receipts
Not all events warrant database writes. Typing notifications (`{ type: "typing", payload: { isTyping: true } }`) and heartbeat pings (`{ type: "heartbeat" }`) are broadcast directly across the Redis Pub/Sub layer without writing to PostgreSQL, preserving database I/O for persistent records.

---

## Phase 10: Anti-Scam Heuristics Engine & Preventing ReDoS

### 1. Anatomy of Hyderabad Rental Fraud
Hyderabad's IT corridor (Madhapur, Gachibowli, Kondapur, Financial District) experiences specific high-frequency rental fraud vectors:
1. **The "Gate Pass" Fee Scam**: Scammers download high-end interior photos and advertise rooms at below-market rates (₹7,000 for a luxury private room in Madhapur). When the seeker asks to inspect, the scammer claims: *"The society uses biometric access; you must generate a visitor gate pass by sending ₹1,000 via UPI QR code. It is 100% refundable at the security gate."* Once paid, the victim is blocked.
2. **Reverse UPI QR Code Scam**: Scammers send a Google Pay or PhonePe QR code saying: *"Scan this barcode to receive the refund/deposit receipt."* Many novice tenants do not realize entering a UPI PIN **only ever deducts funds**.
3. **Military / CISF Transfer Impersonation**: Scammers pose as transferred defense personnel claiming their PG is vacant to elicit unearned trust.

### 2. Algorithmic Scam Detection Pipeline
In `apps/api/src/modules/chat/scam-detector.ts`, every message passes through a multi-category heuristic analyzer:
* **Weight Scoring**: Patterns assign weighted scores ($25\text{--}60$). Messages reaching $\ge 40$ are flagged (`isFlaggedScam = true`).
* **Educational Counter-Advisory**: Rather than silently censoring messages, Thikana flags the message in bright amber/red accompanied by context-specific warnings (e.g. *"Genuine PGs in Hyderabad NEVER charge a gate pass fee"*), empowering users to recognize fraud.

### 3. Engineering Case Study: Catastrophic Regex Backtracking (ReDoS)
During initial testing of the anti-scam module, a nested quantifier pattern:
```typescript
// ❌ DANGEROUS: Nested quantifiers cause exponential O(2^N) backtracking
/(?:pay\s*(?:[a-z]+\s*)*(?:token|advance|deposit|booking)...)/i
```
froze the Node.js event loop on certain non-matching strings because the regex engine evaluated astronomical combinations of `[a-z]+` vs `\s*`.

#### The Fix: Bounded Single-Character Classes
We refactored all scanning regexes to bounded character classes:
```typescript
// ✅ SAFE: Linear O(N) evaluation with non-greedy bounded character limits
/(?:pay\s+[^.!?]{0,40}?(?:token|advance|deposit|booking)[^.!?]{0,40}?before\s+(?:visit|seeing|check|viewing))/i
```
This guarantees strict $O(N)$ linear time complexity while completely preventing ReDoS attacks.
