FROM node:22-alpine AS base
RUN corepack enable

# ---- deps ----
FROM base AS deps
WORKDIR /app
# Copy root workspace manifest + lock file + backstage package.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backstage/package.json ./backstage/
# --ignore-scripts skips the root postinstall hook (cd backend && uv sync)
RUN pnpm install --frozen-lockfile --filter backstage --ignore-scripts

# ---- builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backstage/node_modules ./backstage/node_modules
COPY backstage ./backstage
COPY package.json pnpm-workspace.yaml ./
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/backstage
RUN pnpm build

# ---- runner ----
# With outputFileTracingRoot set to the monorepo root (/app), the standalone
# bundle is laid out relative to /app, so server.js lives at backstage/server.js
# inside the standalone dir, not at the top level.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/backstage/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/backstage/.next/static ./backstage/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "backstage/server.js"]
