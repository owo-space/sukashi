#!/bin/sh
set -eu

if [ "${SKIP_DB_MIGRATE:-0}" != "1" ]; then
  pnpm exec prisma migrate deploy --config prisma.config.ts
fi

exec "$@"
