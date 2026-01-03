FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app
COPY . .

RUN corepack enable \
  && pnpm install \
  && pnpm --filter @family-hub/schemas build \
  && pnpm --filter @family-hub/observability build \
  && pnpm --filter @family-hub/worker build

ENV NODE_ENV=production
WORKDIR /app/apps/worker

CMD ["node", "dist/main.js"]
