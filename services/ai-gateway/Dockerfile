FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app
COPY . .

RUN corepack enable \
  && pnpm install \
  && pnpm --filter @family-hub/schemas build \
  && pnpm --filter @family-hub/observability build \
  && pnpm --filter @family-hub/ai-gateway build

ENV NODE_ENV=production
WORKDIR /app/services/ai-gateway

CMD ["node", "dist/main.js"]
