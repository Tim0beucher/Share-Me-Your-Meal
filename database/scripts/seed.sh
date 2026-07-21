#!/usr/bin/env bash
# Applique seeds/*.sql dans l'ordre contre $DATABASE_URL. Les seeds utilisent
# ON CONFLICT DO NOTHING, donc rejouer ce script est sans risque.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL n'est pas défini." >&2
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../seeds" && pwd)"

for file in "$DIR"/*.sql; do
  echo "seed  $(basename "$file")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

echo "Seeds appliqués."
