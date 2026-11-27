# Multi-stage production Dockerfile for @thikana/web

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.21.0 --activate
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @thikana/shared-types build
RUN pnpm --filter @thikana/web build

# Stage 3: Serve with Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
