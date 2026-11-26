# 🚀 Thikana Production Deployment Guide

This guide provides step-by-step instructions to deploy **Thikana (ठिकाना)** — the Hyderabad commute-first PG finder, Hunt Copilot, and Deposit Shield monorepo.

Repository: [https://github.com/nidhiatwork01-cmyk/Thikana.git](https://github.com/nidhiatwork01-cmyk/Thikana.git)

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────┐
                      │            Users / Web Browser            │
                      └─────────────────────┬─────────────────────┘
                                            │
                                            ▼
                      ┌───────────────────────────────────────────┐
                      │    Frontend: React 18 + Vite + PWA       │
                      │    (Vercel, Netlify, or Nginx Docker)    │
                      └─────────────────────┬─────────────────────┘
                                            │ /api/v1
                                            ▼
                      ┌───────────────────────────────────────────┐
                      │    Backend API: Fastify 5 + WebSockets   │
                      │    (Render, Railway, or Node Container)   │
                      └─────────────┬─────────────────┬───────────┘
                                    │                 │
                                    ▼                 ▼
             ┌──────────────────────────────┐   ┌───────────────────────────┐
             │ PostgreSQL 16 + PostGIS 3.4  │   │  Redis 7 (BullMQ & Chat)  │
             │ (Supabase, Neon, or Docker)  │   │   (Upstash or Docker)     │
             └──────────────────────────────┘   └───────────────────────────┘
```

---

## Method 1: 1-Command Self-Hosted VPS (Recommended for Full Control)
**Cost**: ~$5–$10/month on any Ubuntu/Debian VPS (DigitalOcean Droplet, AWS EC2, Hetzner, Linode).

### Step 1: Provision your VPS
Ensure your VPS has Docker and Docker Compose installed:
```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 2: Clone the Repository
```bash
git clone https://github.com/nidhiatwork01-cmyk/Thikana.git
cd Thikana
```

### Step 3: Configure Production Environment Variables
Create a `.env.production` file:
```bash
cp .env.example .env.production
```
Configure your secrets:
```env
POSTGRES_USER=thikana
POSTGRES_PASSWORD=your_strong_postgres_password_here
POSTGRES_DB=thikana_db

JWT_ACCESS_SECRET=your_32_character_jwt_access_secret_here!
JWT_REFRESH_SECRET=your_32_character_jwt_refresh_secret_here!

# Domain or IP address of your VPS
CORS_ORIGIN=http://your-server-ip
```

### Step 4: Launch the Full Stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 5: Seed Hyderabad PG Listings (Live Well, Star, KR Luxury, etc.)
```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter @thikana/api prisma:seed
```

Your app is now live:
- **Web App**: `http://your-server-ip/`
- **REST API**: `http://your-server-ip/api/v1`
- **Swagger Documentation**: `http://your-server-ip:4000/docs`

---

## Method 2: Zero-Cost Cloud PaaS (Vercel + Render + Supabase)
Best for deploying without maintaining Linux servers.

### Step 1: Set Up PostGIS Database (Supabase)
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the **SQL Editor**, enable the PostGIS extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Copy your project connection string from **Project Settings -> Database**:
   ```
   postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### Step 2: Set Up Managed Redis (Upstash)
1. Go to [upstash.com](https://upstash.com) and create a free Redis database.
2. Copy the `rediss://...` connection string.

### Step 3: Deploy Backend API on Render
1. Go to [render.com](https://render.com) and click **New + -> Blueprint**.
2. Connect your GitHub repository: `https://github.com/nidhiatwork01-cmyk/Thikana`.
3. Render reads `render.yaml` and deploys the `thikana-api` service.
4. Set the environment variables:
   - `DATABASE_URL`: Your Supabase connection string
   - `REDIS_URL`: Your Upstash connection string
   - `CORS_ORIGIN`: `*` (or your Vercel frontend URL once deployed)
5. Under settings, trigger a manual deploy or run:
   ```bash
   pnpm --filter @thikana/api prisma migrate deploy
   pnpm --filter @thikana/api prisma:seed
   ```
6. Your backend will be live at: `https://thikana-api.onrender.com`.

### Step 4: Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Import `https://github.com/nidhiatwork01-cmyk/Thikana`.
3. Configure the build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (or `apps/web`)
   - **Build Command**: `pnpm --filter @thikana/shared-types build && pnpm --filter @thikana/web build`
   - **Output Directory**: `apps/web/dist`
4. Add the Environment Variable:
   - `VITE_API_URL`: `https://thikana-api.onrender.com/api/v1`
5. Click **Deploy**.

---

## Environment Variables Reference

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | API Server port | `4000` |
| `HOST` | Bind host address | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/thikana_db` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `CORS_ORIGIN` | Allowed web origins | `https://thikana.vercel.app` or `*` |
| `JWT_ACCESS_SECRET` | 32+ character key for access tokens | *Cryptographic secret* |
| `JWT_REFRESH_SECRET` | 32+ character key for refresh tokens | *Cryptographic secret* |
| `VITE_API_URL` | API base URL for Frontend | `https://api.yourdomain.com/api/v1` or `/api/v1` |

---

## Health Check & Verification
Once deployed, verify your endpoints:
- **API Health**: `curl https://your-domain.com/api/v1/health` (should return `{"status":"ok"}`)
- **Locality Metadata**: `curl https://your-domain.com/api/v1/meta/localities`
- **Commute Search**: `curl "https://your-domain.com/api/v1/commute/search?destLat=17.4428&destLng=78.3812&travelMode=bike&maxMinutes=30"`
