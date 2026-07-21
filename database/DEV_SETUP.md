# Base de développement locale (sans Docker)

Une instance PostgreSQL 18 tourne localement pour le développement, installée à partir des
binaires officiels EDB (zip, sans installeur) plutôt que Docker (non disponible sur cette
machine). Chemins choisis **sans caractère accentué** (le compte Windows `Timothé` fait planter
`initdb`/`postgres` sur des chemins contenant "é" — bug connu de PostgreSQL sous Windows) :

- Binaires : `C:\pgsql`
- Données : `C:\pgdata_dev`
- Port : `5432`, utilisateur `postgres`, authentification `trust` (dev local uniquement)
- Base : `recette_app`

## Démarrer / arrêter

```bash
# démarrer
C:/pgsql/bin/pg_ctl.exe -D "C:/pgdata_dev" -l "C:/pgdata_dev/server.log" -o "-p 5432" start

# arrêter
C:/pgsql/bin/pg_ctl.exe -D "C:/pgdata_dev" stop -m fast
```

## Réappliquer schéma/seeds après une modification

```bash
export PATH="/c/pgsql/bin:$PATH"
export DATABASE_URL="postgres://postgres@127.0.0.1:5432/recette_app"
./scripts/migrate.sh
./scripts/seed.sh
```

`backend/.env` doit pointer vers `DATABASE_URL=postgres://postgres@127.0.0.1:5432/recette_app`.

**Ne pas committer** `C:\pgsql` ni `C:\pgdata_dev` (hors du repo, aucun risque, mais à savoir si
vous changez de machine : il faudra refaire ces étapes ou passer à Docker/une base managée).
