FROM node:20-alpine AS builder

WORKDIR /app
ENV CI=true
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker ./apps/worker
COPY packages/observability ./packages/observability
COPY packages/schemas ./packages/schemas

RUN pnpm install \
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
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages/observability ./packages/observability
COPY --from=builder /app/packages/schemas ./packages/schemas

WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]
