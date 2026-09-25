#!/usr/bin/env bash
# Nightly pg_dump with retention + optional S3 sync.
# Usage: ./scripts/backup.sh [retention_days]
# Env: POSTGRES_USER POSTGRES_DB PGHOST PGPORT PGPASSWORD BACKUP_DIR S3_DEST
set -euo pipefail
RETENTION="${1:-14}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/etoile-$TS.sql.gz"
echo "→ dumping to $OUT"
pg_dump -U "${POSTGRES_USER:-root}" -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" "${POSTGRES_DB:-etoile}" | gzip > "$OUT"
echo "✓ $OUT ($(du -h "$OUT" | cut -f1))"
find "$BACKUP_DIR" -name 'etoile-*.sql.gz' -mtime +"$RETENTION" -delete || true
if [ -n "${S3_DEST:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$OUT" "$S3_DEST/" && echo "✓ synced to $S3_DEST"
  else
    echo "⚠ S3_DEST set but aws cli missing — skipping sync"
  fi
fi
echo "Keep: last $RETENTION days in $BACKUP_DIR"
