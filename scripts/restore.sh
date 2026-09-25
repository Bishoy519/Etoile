#!/usr/bin/env bash
# Restore a backup into the compose/local database.
# Usage: ./scripts/restore.sh backups/etoile-YYYYMMDD-HHMMSS.sql.gz [--yes]
set -euo pipefail
FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: ./scripts/restore.sh backups/<file>.sql.gz [--yes]"
  exit 1
fi
if [ "${2:-}" != "--yes" ]; then
  echo "⚠ This will OVERWRITE ${POSTGRES_DB:-etoile}. Re-run with --yes to confirm."
  exit 1
fi
echo "→ restoring $FILE"
if [[ "$FILE" == *.gz ]]; then
  gunzip -c "$FILE" | psql -U "${POSTGRES_USER:-root}" -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" "${POSTGRES_DB:-etoile}"
else
  psql -U "${POSTGRES_USER:-root}" -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" "${POSTGRES_DB:-etoile}" < "$FILE"
fi
echo "✓ restore complete — verify with: SELECT count(*) FROM \"Invoice\";"
