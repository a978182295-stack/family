FROM node:20-alpine AS builder

WORKDIR /app
ENV CI=true
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/observability ./packages/observability
COPY packages/schemas ./packages/schemas

RUN pnpm install \
  && pnpm --filter @family-hub/schemas build \
  && pnpm --filter @family-hub/observability build \
  && pnpm --filter @family-hub/api build \
  && pnpm prune --prod

FROM node:20-alpine

RUN apk add --no-cache curl

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/observability ./packages/observability
COPY --from=builder /app/packages/schemas ./packages/schemas

WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
