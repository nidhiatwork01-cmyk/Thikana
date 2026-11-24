# Project Thikana — Knowledge Base & External Services

This document tracks all external services, API credentials, configuration guides, and operational details for **Thikana**.

---

## 1. External Routing & Isochrone Provider: OpenRouteService (ORS)

* **Provider**: OpenRouteService (HeiGIT - Heidelberg Institute for Geoinformation Technology)
* **Website**: [openrouteservice.org](https://openrouteservice.org)
* **Service Role**: Computes travel-time isochrones and distance/duration matrices between coordinates.
* **API Key**: `your_openrouteservice_api_key_here` (Configure in `.env`)
* **Free Tier Limits**:
  * **Isochrones API**: 20 requests/minute, 2,000 requests/day
  * **Matrix API**: 40 requests/minute, 2,500 requests/day
* **Environment Variable**: `OPENROUTESERVICE_API_KEY` (saved in `.env`)
* **Fallback Strategy**:
  When the ORS quota is exceeded or the network is offline, the backend automatically falls back to the **Calibrated Hyderabad Peak-Hour Congestion Model**, so the app never throws 500 errors to users.

---

## 2. Local Database & Cache Infrastructure (Docker)

* **PostgreSQL + PostGIS**:
  * **Image**: `postgis/postgis:16-3.4`
  * **Connection String**: `postgresql://thikana:thikana_secret@localhost:5432/thikana_db?schema=public`
  * **Default Port**: `5432`
  * **Extensions Installed**: `postgis`, `postgis_topology`

* **Redis**:
  * **Image**: `redis:7-alpine`
  * **Connection String**: `redis://localhost:6379`
  * **Default Port**: `6379`
  * **Usage**: Caching isochrone GeoJSON polygons, rate limiting, WebSockets Pub/Sub message distribution.

* **MinIO (S3-Compatible Object Storage)**:
  * **Image**: `minio/minio:latest`
  * **Console URL**: `http://localhost:9001`
  * **API URL**: `http://localhost:9000`
  * **Access Key**: `minioadmin`
  * **Secret Key**: `minioadmin`
  * **Default Vault Bucket**: `thikana-vault`
  * **Usage**: Storing Deposit Shield room inspection photos, sealed PDFs, and user avatars.

---

## 3. Security & Secrets Management Best Practices

1. **`.env` is Git-Ignored**: The live `.env` file containing secrets is in `.gitignore` to prevent leaking keys to public Git repositories.
2. **Rotating Refresh Tokens**: Auth tokens are generated using SHA-256 JWTs and stored in httpOnly, Secure cookies to mitigate XSS and CSRF risks.
3. **Presigned Upload URLs**: Users never upload directly through backend API memory. The API generates temporary (15-minute) presigned S3 PUT URLs directly to MinIO/R2, keeping API memory footprints near zero even under heavy media uploads.
