FROM node:22-alpine AS base
RUN corepack enable

# ---- deps ----
FROM base AS deps
WORKDIR /app
# Copy root workspace manifest + lock file + backstage package.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backstage/package.json ./backstage/
# Install only backstage deps (ignore other workspaces)
RUN pnpm install --frozen-lockfile --filter backstage

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
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/backstage/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/backstage/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/backstage/.next/static ./.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
