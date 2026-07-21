-- Table de suivi des migrations appliquées (bookkeeping minimal, pas de
-- framework requis). Chaque script scripts/migrate.* insère une ligne ici
-- après avoir exécuté un fichier de migrations/ avec succès.

CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
