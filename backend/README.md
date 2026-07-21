# API — recette-app (MVP)

NestJS + TypeScript, requêtes typées via [Kysely](https://kysely.dev) (pas d'ORM à schéma
propre : `../database/migrations` reste la seule source de vérité pour la structure des tables).

## Démarrer

```bash
cp .env.example .env   # renseigner DATABASE_URL vers une base déjà migrée + seedée
npm install
npm run build && npm start
# ou en dev : npm run start:dev
```

La base cible doit avoir reçu `../database/scripts/migrate.sh` et `seed.sh` au préalable.

## Portée de ce MVP

Couvre les parcours 1 et 2 du brief (création de recette avec calcul automatique des macros,
adaptation d'une recette avec recalcul et diff), like/save, la suggestion d'équivalent cuit pour
un ingrédient cru, et l'espace personnel (profil, listes, playlists, activité). Ce que ça ne
couvre **pas** encore : upload de photos, recherche/filtres avancés, commentaires, journal
alimentaire calorique, modération — voir `../database/README.md` pour le reste du modèle de
données déjà prêt à l'emploi pour ces fonctionnalités.

## Endpoints

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Créer un compte (email/mot de passe) |
| POST | `/auth/login` | — | Connexion, renvoie un JWT |
| GET | `/foods?search=` | — | Recherche d'aliments (nom, `ILIKE`) |
| GET | `/foods/:id/cooked-equivalents` | — | Suggère des aliments cuits proches (similarité de nom) pour un aliment cru |
| GET | `/recipes?limit=` | — | Fil des recettes publiées |
| GET | `/recipes/:id` | — | Détail d'une recette (ingrédients, étapes, macros total/portion/100g, nb d'adaptations) |
| POST | `/recipes` | ✓ | Créer une recette (ingrédients + grammages → macros calculées et mises en cache) |
| POST | `/recipes/:id/adapt` | ✓ | Adapter une recette (fork) : nouveaux grammages/portions, calcule le diff vs l'originale |
| POST/DELETE | `/recipes/:id/like` | ✓ | Aimer / retirer un like |
| POST/DELETE | `/recipes/:id/save` | ✓ | Enregistrer / retirer des favoris |
| POST | `/recipes/:id/cook-events` | ✓ | Marquer la recette comme cuisinée maintenant (alimente le graphique d'activité) |
| GET/PATCH | `/me` | ✓ | Profil personnel (coordonnées, morphologie, objectif nutritionnel actif) |
| GET | `/me/recipes` \| `/me/liked-recipes` \| `/me/saved-recipes` | ✓ | Recettes postées / aimées / enregistrées par l'utilisateur |
| GET/POST | `/me/collections` | ✓ | Lister / créer des playlists de recettes |
| GET/POST/DELETE | `/me/collections/:id/recipes[/:recipeId]` | ✓ | Contenu d'une playlist, ajouter/retirer une recette |
| GET | `/me/activity?granularity=day\|week\|month&count=N` | ✓ | Nombre de recettes cuisinées par période, buckets vides inclus (pour le graphique) |

Auth : header `Authorization: Bearer <token>`.

## Calcul des macros (`src/recipes/macro-calculator.ts`)

Chaque ingrédient est résolu en grammes (direct si l'unité est `gramme`, sinon via
`food_unit_equivalences` — équivalence spécifique à l'aliment en priorité, sinon générique).
Les macros de chaque ligne sont `valeur_100g × grammes / 100`, sommées pour le total, puis
dérivées par portion (`/ servings`) et pour 100 g (`× 100 / poids_total`). `recipes.total_*`
sert de cache dénormalisé écrit à la création/l'adaptation ; `GET /recipes/:id` recalcule à la
volée depuis `recipe_ingredients` + `foods` (source de vérité), donc reste correct même si les
valeurs d'un aliment sont corrigées après coup.

## Validé

Testé de bout en bout contre une instance PostgreSQL locale : inscription, connexion (vérifié que
la réponse ne fuite pas le hash du mot de passe — bug trouvé et corrigé pendant ce test), recherche
d'aliment, création d'une recette avec les 4 ingrédients de l'exemple du brief (calories/macros
cohérentes avec le calcul SQL manuel), adaptation avec diff calorique correct, comptage des
adaptations, like, fil d'actualité, et rejet 401 sur une route protégée sans token. Espace
personnel testé en navigateur réel : édition du profil, listes de recettes, création de playlist
et ajout d'une recette dedans, marquage "cuisinée" et graphique d'activité mis à jour en
conséquence (7 jours / 12 semaines).

**Bug trouvé et corrigé pendant ce test** : `birth_date` (colonne `DATE`) revenait décalée d'un
jour côté client. node-pg parse par défaut `DATE` en objet `Date` à minuit *heure locale du
serveur*, resérialisé en JSON via `toISOString()` (UTC) — sur un serveur dans un fuseau en avance
sur UTC (Europe/Paris), ça décale la date d'un jour en arrière. `DATE` n'a pas de composante
horaire : `database.module.ts` la garde maintenant en texte brut (`types.setTypeParser(1082, ...)`),
sans passer par `Date` du tout.

Non testé : montée en charge, upload de fichiers, comportement multi-utilisateurs concurrents.
