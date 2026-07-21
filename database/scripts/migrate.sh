#!/usr/bin/env bash
# Applique migrations/*.sql dans l'ordre contre $DATABASE_URL, en suivant
# les fichiers déjà appliqués dans la table schema_migrations.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL n'est pas défini." >&2
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../migrations" && pwd)"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());" \
  > /dev/null

for file in "$DIR"/*.sql; do
  name="$(basename "$file")"
  already_applied=$(psql "$DATABASE_URL" -tA -c "SELECT 1 FROM schema_migrations WHERE filename = '$name';")
  if [ "$already_applied" = "1" ]; then
    echo "skip  $name (déjà appliquée)"
    continue
  fi
  echo "apply $name"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (filename) VALUES ('$name');" > /dev/null
done

echo "Migrations à jour."
