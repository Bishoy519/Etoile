#!/bin/sh
set -e

echo "🩰 ========================================================="
echo "🩰 ÉTOILE BALLET ACADEMY — PRODUCTION CONTAINER STARTUP"
echo "🩰 ========================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "📡 Running Prisma schema synchronization (db push)..."
  npx prisma db push --skip-generate --accept-data-loss

  if [ "$AUTO_SEED" = "true" ]; then
    echo "🌱 AUTO_SEED is enabled: Seeding conservatory records..."
    node dist/prisma/seed.js || echo "⚠️ Seeding skipped or already applied."
  fi
fi

echo "🚀 Launching Étoile NestJS REST Engine on port ${PORT:-3001}..."
exec "$@"
