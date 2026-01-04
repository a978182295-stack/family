FROM node:20-alpine AS builder

WORKDIR /app
ENV CI=true
ENV PNPM_STORE_DIR=/app/.pnpm-store
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml ./
COPY services/ai-gateway ./services/ai-gateway
COPY packages/observability ./packages/observability
COPY packages/schemas ./packages/schemas

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @family-hub/schemas build \
  && pnpm --filter @family-hub/observability build \
  && pnpm --filter @family-hub/ai-gateway build \
  && pnpm prune --prod

FROM node:20-alpine

RUN apk add --no-cache curl

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/ai-gateway/package.json ./services/ai-gateway/package.json
COPY --from=builder /app/services/ai-gateway/node_modules ./services/ai-gateway/node_modules
COPY --from=builder /app/services/ai-gateway/dist ./services/ai-gateway/dist
COPY --from=builder /app/packages/observability/package.json ./packages/observability/package.json
COPY --from=builder /app/packages/observability/dist ./packages/observability/dist
COPY --from=builder /app/packages/schemas/package.json ./packages/schemas/package.json
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist

WORKDIR /app/services/ai-gateway
CMD ["node", "dist/main.js"]
