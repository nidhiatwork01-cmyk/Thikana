# Thikana (ठिकाना) 📍

> **Hyderabad's Commute-First PG Finder, Visit Copilot, Buddy Network & Deposit Shield**

Finding a PG in Hyderabad is painful: listings are scattered, you can't search by real travel time, brokers make empty promises, and deposits get unfairly deducted at move-out. 

**Thikana** solves the entire relocation journey across four unified modules:
1. **Commute Map**: Search by peak-hour travel time (isochrones), not vague area names.
2. **Hunt Copilot**: Plan on-site visits with 2-opt route optimization, structured checklists, and weighted scoring.
3. **Buddy Network**: Hire trusted locals for nominal advice over chat or call with built-in scam guardrails.
4. **Deposit Shield**: Document room conditions at move-in with tamper-evident cryptographic SHA-256 hash chains.

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v20+ (v22 recommended)
- **pnpm**: v10+ (`npm install -g pnpm`)
- **Docker Desktop**: For running PostgreSQL + PostGIS, Redis, and MinIO

### 2. Environment Setup
The project comes with a configured `.env`:
```bash
# Review or edit .env
cat .env
```
Key documentation and external service configs are stored in [docs/PROJECT_KNOWLEDGE.md](docs/PROJECT_KNOWLEDGE.md).

### 3. Start Infrastructure
```bash
# Start PostGIS, Redis, and MinIO in Docker
docker compose up -d
```

### 4. Install & Run
```bash
# Install workspace dependencies
pnpm install

# Start both frontend and backend concurrently
pnpm dev
```
* **Frontend**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
* **API Health Check**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)
* **MinIO Console**: [http://localhost:9001](http://localhost:9001)

---

## Architectural Documentation & Learning
- **[LEARN.md](LEARN.md)**: Deep dive into the "why" behind each architectural decision, code pattern, and algorithm.
- **[PROJECT_KNOWLEDGE.md](docs/PROJECT_KNOWLEDGE.md)**: External API keys, service quotas, and infrastructure configurations.
