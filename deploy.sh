#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== store deploy: branch=$BRANCH ==="

git fetch origin
git reset --hard "origin/$BRANCH"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
else
  echo "ERROR: .env not found — aborting" >&2
  exit 1
fi

# Ensure the store Postgres user + DB exist (idempotent)
echo "--- ensuring DB user and database ---"
docker exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "DO \$\$ BEGIN
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$STORE_DB_USER') THEN
       CREATE USER $STORE_DB_USER WITH PASSWORD '$STORE_DB_PASSWORD';
     ELSE
       ALTER USER $STORE_DB_USER WITH PASSWORD '$STORE_DB_PASSWORD';
     END IF;
   END \$\$;" 2>/dev/null || true

docker exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "CREATE DATABASE $STORE_DB_NAME OWNER $STORE_DB_USER;" 2>/dev/null || true

docker exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "GRANT ALL PRIVILEGES ON DATABASE $STORE_DB_NAME TO $STORE_DB_USER;" 2>/dev/null || true

echo "--- building and starting containers ---"
docker compose build --no-cache
docker compose up -d --force-recreate

echo "=== deploy complete ==="
