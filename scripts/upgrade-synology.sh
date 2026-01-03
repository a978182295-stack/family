#!/bin/sh
set -eu

BASE_DIR="${BASE_DIR:-/volume1/docker/family}"
ENV_FILE="${ENV_FILE:-$BASE_DIR/env/dev.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$BASE_DIR/infra/compose/docker-compose.synology.yml}"

if [ ! -f "$ENV_FILE" ]; then
  echo "env file not found: $ENV_FILE" >&2
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
