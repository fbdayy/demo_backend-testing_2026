# syntax=docker/dockerfile:1

# ─── Arguments, set once at the beginning ──────────────────────────────────────
ARG NODE_VERSION=22.16.0
ARG PNPM_VERSION=11.9.0
ARG OPENSSL_VERSION=3.5.7-r0
ARG ALPINE_VERSION=3.22

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: base — minimal layer with pnpm and working directory
# ════════════════════════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

ARG OPENSSL_VERSION

RUN apk add --no-cache openssl=${OPENSSL_VERSION}

ARG PNPM_VERSION

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: deps — only prod dependencies (for final image)
# ════════════════════════════════════════════════════════════════════════════════
FROM base AS deps

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json

RUN pnpm install --filter backend --frozen-lockfile --prod --ignore-scripts

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: dev-deps — all dependencies including devDependencies
# ════════════════════════════════════════════════════════════════════════════════
FROM base AS dev-deps

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json

RUN pnpm install --filter backend --frozen-lockfile --ignore-scripts

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: development — hot-reload image for local development
# ════════════════════════════════════════════════════════════════════════════════
FROM base AS development

ENV NODE_ENV=development

COPY --from=dev-deps /app/node_modules ./node_modules
COPY --from=dev-deps /app/backend/node_modules ./backend/node_modules

COPY pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
COPY backend/tsconfig*.json ./backend/

# Switch to backend BEFORE generate so that prisma finds schema and node_modules
WORKDIR /app/backend

# prisma/schema.prisma is mounted as a volume at runtime, but generate is needed
# at build time — copy the schema explicitly for this step
COPY backend/prisma ./prisma

# Run generate from /app/backend — prisma will find ./prisma/schema.prisma
# and place the client in ./node_modules/.prisma/client (protected by an anonymous volume)
RUN pnpm prisma generate

EXPOSE 3000
# Node.js inspector for IDE debugger
EXPOSE 9229
# Prisma Studio (the prisma-studio service overrides CMD)
EXPOSE 5555

# docker-compose.override.yml overrides this command via `command`
CMD ["pnpm", "dev"]

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: builder — compile TypeScript for production
# ════════════════════════════════════════════════════════════════════════════════
FROM base AS builder

COPY --from=dev-deps /app/node_modules ./node_modules
COPY --from=dev-deps /app/backend/node_modules ./backend/node_modules

COPY pnpm-workspace.yaml ./
COPY backend ./backend

WORKDIR /app/backend

RUN pnpm prisma generate \
 && pnpm build

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: production — final minimal image
# ════════════════════════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS production

ARG PNPM_VERSION

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate \
 && addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=deps    --chown=appuser:appgroup /app/node_modules          ./node_modules
COPY --from=deps    --chown=appuser:appgroup /app/backend/node_modules  ./backend/node_modules
COPY --from=builder --chown=appuser:appgroup /app/backend/dist          ./backend/dist
COPY --from=builder --chown=appuser:appgroup /app/backend/prisma        ./backend/prisma
COPY --chown=appuser:appgroup backend/package.json ./backend/package.json
COPY --chown=appuser:appgroup pnpm-workspace.yaml  ./

USER appuser

WORKDIR /app/backend

EXPOSE 3000

# NestJS compiles to dist/main.js
CMD ["node", "dist/main.js"]
