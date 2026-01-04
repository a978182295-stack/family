#!/bin/sh
set -eu

BASE_DIR="${BASE_DIR:-/volume1/docker/family}"
ENV_FILE="${ENV_FILE:-$BASE_DIR/env/dev.env}"
COMPOSE_BASE="${COMPOSE_BASE:-$BASE_DIR/infra/compose/docker-compose.yml}"
COMPOSE_OVERLAY="${COMPOSE_OVERLAY:-$BASE_DIR/infra/compose/docker-compose.prod.yml}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io/a978182295-stack}"
IMAGE_TAG="${IMAGE_TAG:-prod}"

if [ ! -f "$ENV_FILE" ]; then
  echo "env file not found: $ENV_FILE" >&2
  exit 1
fi

if [ ! -f "$COMPOSE_BASE" ]; then
  echo "compose file not found: $COMPOSE_BASE" >&2
  exit 1
fi

COMPOSE_ARGS="-f $COMPOSE_BASE"
if [ -n "${COMPOSE_OVERLAY:-}" ]; then
  if [ ! -f "$COMPOSE_OVERLAY" ]; then
    echo "compose file not found: $COMPOSE_OVERLAY" >&2
    exit 1
  fi
  COMPOSE_ARGS="$COMPOSE_ARGS -f $COMPOSE_OVERLAY"
fi

IMAGE_REGISTRY="$IMAGE_REGISTRY" IMAGE_TAG="$IMAGE_TAG" \
  docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS pull

IMAGE_REGISTRY="$IMAGE_REGISTRY" IMAGE_TAG="$IMAGE_TAG" \
  docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS up -d
