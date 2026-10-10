#!/usr/bin/env bash
# Checks that every migration can be rolled back and applied again.
#   scripts/verify-migrations.sh <database-url>
# Expects the migrations to be applied already (CI: `supabase db start`).
# Run it only against a throwaway database — it drops and recreates objects.
set -euo pipefail

DB_URL="${1:?usage: verify-migrations.sh <database-url>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
ROLLBACKS="$ROOT/supabase/rollbacks"

missing=0
for migration in "$MIGRATIONS"/*.sql; do
  name="$(basename "$migration" .sql)"
  if [[ ! -f "$ROLLBACKS/$name.down.sql" ]]; then
    echo "✗ missing rollback: supabase/rollbacks/$name.down.sql"
    missing=1
  fi
done
[[ $missing -eq 0 ]] || exit 1

psql_run() { psql "$DB_URL" --quiet --no-psqlrc -v ON_ERROR_STOP=1 "$@"; }

echo "→ rolling back (newest first)"
for rollback in $(ls -r "$ROLLBACKS"/*.down.sql); do
  echo "  $(basename "$rollback")"
  psql_run -f "$rollback"
done

echo "→ re-applying (oldest first)"
for migration in "$MIGRATIONS"/*.sql; do
  echo "  $(basename "$migration")"
  psql_run -f "$migration" 2> >(grep -v "already exists, skipping" >&2)
done

echo "✓ all migrations roll back and re-apply cleanly"
