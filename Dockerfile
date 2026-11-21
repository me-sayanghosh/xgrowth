# Multi-stage production build for XGrowth AI
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production

# Stage 1: Dependencies and Build
FROM base AS builder
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all dependencies including devDependencies for build
ENV NODE_ENV=development
RUN npm install --frozen-lockfile || npm install

# Copy source code and config
COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build all monorepo packages
RUN npm run build

# Stage 2: Production API Runtime
FROM node:22-alpine AS api-runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 xgrowth

# Copy dependency manifests and installed production dependencies
COPY --from=builder --chown=xgrowth:nodejs /app/package.json ./
COPY --from=builder --chown=xgrowth:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=xgrowth:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=xgrowth:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=xgrowth:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=xgrowth:nodejs /app/packages/config/package.json ./packages/config/
COPY --from=builder --chown=xgrowth:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=xgrowth:nodejs /app/apps/api/package.json ./apps/api/

USER xgrowth
EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
