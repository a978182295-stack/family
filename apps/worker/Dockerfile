FROM node:20-alpine AS builder

WORKDIR /app
ENV CI=true
ENV PNPM_STORE_DIR=/app/.pnpm-store
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml ./
COPY apps/worker ./apps/worker
COPY packages/observability ./packages/observability
COPY packages/schemas ./packages/schemas

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @family-hub/schemas build \
  && pnpm --filter @family-hub/observability build \
  && pnpm --filter @family-hub/worker build \
  && pnpm prune --prod

FROM node:20-alpine

RUN apk add --no-cache curl

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages/observability/package.json ./packages/observability/package.json
COPY --from=builder /app/packages/observability/dist ./packages/observability/dist
COPY --from=builder /app/packages/schemas/package.json ./packages/schemas/package.json
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist

WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]
