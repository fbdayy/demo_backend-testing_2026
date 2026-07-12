# syntax=docker/dockerfile:1

# ─── Аргументы, единожды заданные в начале ────────────────────────────────────
ARG NODE_VERSION=22.16.0
ARG PNPM_VERSION=11.9.0
ARG OPENSSL_VERSION=3.5.7-r0
ARG ALPINE_VERSION=3.22

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: base — минимальный слой с pnpm и рабочей директорией
# ════════════════════════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

ARG OPENSSL_VERSION

RUN apk add --no-cache openssl=${OPENSSL_VERSION}

ARG PNPM_VERSION

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: deps — только prod-зависимости (для финального образа)
# ════════════════════════════════════════════════════════════════════════════════
FROM base AS deps

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json

RUN pnpm install --filter backend --frozen-lockfile --prod --ignore-scripts

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: dev-deps — все зависимости включая devDependencies
# ════════════════════════════════════════════════════════════════════════════════
FROM base AS dev-deps

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json

RUN pnpm install --filter backend --frozen-lockfile --ignore-scripts

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: development — hot-reload образ для локальной разработки
# ════════════════════════════════════════════════════════════════════════════════
FROM base AS development

ENV NODE_ENV=development

COPY --from=dev-deps /app/node_modules ./node_modules
COPY --from=dev-deps /app/backend/node_modules ./backend/node_modules

COPY pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
COPY backend/tsconfig*.json ./backend/

# Переключаемся в backend ДО generate, чтобы prisma нашла schema и node_modules
WORKDIR /app/backend

# prisma/schema.prisma монтируется volume'ом в рантайме, но generate нужен
# при сборке образа — копируем схему явно для этого шага
COPY backend/prisma ./prisma

# Запускаем generate из /app/backend — prisma найдёт ./prisma/schema.prisma
# и положит клиент в ./node_modules/.prisma/client (защищён анонимным volume)
RUN pnpm prisma generate

EXPOSE 3000
# Node.js inspector для дебаггера IDE
EXPOSE 9229
# Prisma Studio (сервис prisma-studio переопределяет CMD)
EXPOSE 5555

# docker-compose.override.yml переопределяет эту команду через `command`
CMD ["pnpm", "dev"]

# ════════════════════════════════════════════════════════════════════════════════
# STAGE: builder — компилируем TypeScript для production
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
# STAGE: production — финальный минимальный образ
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

# NestJS компилируется в dist/main.js
CMD ["node", "dist/main.js"]
