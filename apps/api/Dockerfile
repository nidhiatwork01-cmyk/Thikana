# Multi-stage production Dockerfile for @thikana/api

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.21.0 --activate
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

# Build shared-types first, then generate Prisma client, then build API
RUN pnpm --filter @thikana/shared-types build
RUN pnpm --filter @thikana/api prisma:generate
RUN pnpm --filter @thikana/api build

# Stage 3: Runner
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@12.21.0 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types ./packages/shared-types
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

EXPOSE 4000

# Run idempotent schema push, PostGIS setup, and initial seed (if empty), then start API server
CMD ["sh", "-c", "cd apps/api && npx tsx prisma/boot.ts && cd /app && node apps/api/dist/server.js"]
