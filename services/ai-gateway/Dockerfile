FROM node:20-alpine AS builder

WORKDIR /app
ENV CI=true
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY services/ai-gateway ./services/ai-gateway
COPY packages/observability ./packages/observability
COPY packages/schemas ./packages/schemas

RUN pnpm install \
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
COPY --from=builder /app/services/ai-gateway/dist ./services/ai-gateway/dist
COPY --from=builder /app/packages/observability ./packages/observability
COPY --from=builder /app/packages/schemas ./packages/schemas

WORKDIR /app/services/ai-gateway
CMD ["node", "dist/main.js"]
