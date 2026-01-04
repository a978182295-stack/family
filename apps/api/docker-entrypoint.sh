#!/bin/sh
set -e

if [ "${NODE_ENV:-}" = "production" ]; then
  if [ -x "./node_modules/.bin/prisma" ] && [ -d "./prisma/migrations" ]; then
    echo "Running prisma migrate deploy..."
    ./node_modules/.bin/prisma migrate deploy
  else
    echo "Prisma migrate skipped (missing CLI or migrations)."
  fi
fi

exec "$@"
