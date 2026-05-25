#!/usr/bin/env bash
# Deploy store on the Ubuntu home server.
#
# Accepts any git ref — a branch name, a tag, or a commit SHA:
#   ./deploy.sh             -> deploys latest tag, falls back to dev
#   ./deploy.sh dev         -> latest origin/dev
#   ./deploy.sh main        -> latest origin/main
#   ./deploy.sh v1.2.0      -> exact tagged release
#
# Loads env from ./.env, ensures the store Postgres user + DB exist in the
# shared postgres container, then rebuilds and restarts the docker stack.
# Does NOT touch host nginx — copy nginx-host.conf manually.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=> Fetching from origin (branches + tags)"
git fetch --tags --prune --force origin

if [[ $# -eq 0 ]]; then
  LATEST_TAG="$(git tag --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]' | head -1)"
  if [[ -z "$LATEST_TAG" ]]; then
    echo "WARN: no version tags found — falling back to dev branch" >&2
    REF="dev"
  else
    REF="$LATEST_TAG"
    echo "=> No ref specified — deploying latest tag: $REF"
  fi
else
  REF="$1"
fi

if git rev-parse --verify --quiet "origin/$REF" >/dev/null; then
  TARGET="origin/$REF"
  KIND="branch"
elif git rev-parse --verify --quiet "refs/tags/$REF" >/dev/null; then
  TARGET="refs/tags/$REF"
  KIND="tag"
elif git rev-parse --verify --quiet "$REF^{commit}" >/dev/null; then
  TARGET="$REF"
  KIND="ref"
else
  echo "ERROR: cannot resolve '$REF' as a branch, tag, or commit" >&2
  exit 1
fi

SHA="$(git rev-parse --short "$TARGET^{commit}")"
echo "=> Resetting to $TARGET ($KIND, commit $SHA)"
git reset --hard "$TARGET"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found — copy .env.template to .env and fill in values" >&2
  exit 1
fi

set -a
source .env
set +a

: "${POSTGRES_USER:?POSTGRES_USER must be set in .env}"
: "${POSTGRES_DB:?POSTGRES_DB must be set in .env}"
: "${STORE_DB_USER:?STORE_DB_USER must be set in .env}"
: "${STORE_DB_PASSWORD:?STORE_DB_PASSWORD must be set in .env}"
: "${STORE_DB_NAME:?STORE_DB_NAME must be set in .env}"

echo "=> Ensuring Postgres role and database exist"
docker exec -i \
  postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=0 \
  -v store_user="$STORE_DB_USER" \
  -v store_pw="$STORE_DB_PASSWORD" \
  <<'SQL' || true
CREATE ROLE :"store_user" LOGIN PASSWORD :'store_pw';
ALTER ROLE :"store_user" WITH LOGIN PASSWORD :'store_pw';
SQL

if ! docker exec -i postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${STORE_DB_NAME}'" | grep -q 1; then
  docker exec -i postgres createdb -U "$POSTGRES_USER" -O "$STORE_DB_USER" "$STORE_DB_NAME"
  echo "   created database $STORE_DB_NAME"
else
  echo "   database $STORE_DB_NAME already exists"
fi

echo "=> Building and restarting store stack ($KIND $REF @ $SHA)"
docker compose build --no-cache
docker compose up -d --force-recreate

echo "=== deploy complete: $KIND '$REF' (commit $SHA) ==="
