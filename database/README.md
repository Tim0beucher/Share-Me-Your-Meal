# Schéma de base de données — App recettes & macros

- [`schema.sql`](schema.sql) — vue consolidée de référence, tout le DDL en un seul fichier (pratique pour relire l'ensemble du modèle).
- [`migrations/`](migrations) — la même chose découpée en fichiers numérotés, **source de vérité** pour appliquer le schéma. `schema.sql` doit être tenu à jour manuellement si vous modifiez une migration.
- [`seeds/`](seeds) — données de référence : tables lookup, équivalences d'unité génériques, aliments CIQUAL.
- [`scripts/`](scripts) — `migrate.sh`/`migrate.ps1` et `seed.sh`/`seed.ps1` pour appliquer le tout contre `$DATABASE_URL`.

## Appliquer le schéma

```bash
export DATABASE_URL=postgres://user:password@host:5432/dbname
./scripts/migrate.sh   # crée les tables (idempotent : rejoue sans erreur)
./scripts/seed.sh      # charge les données de référence (idempotent : ON CONFLICT DO NOTHING)
```

Sous PowerShell : `$env:DATABASE_URL = "..."`, puis `.\scripts\migrate.ps1` et `.\scripts\seed.ps1`.

**Validé contre un vrai PostgreSQL 18** (instance locale temporaire, binaires officiels EDB, sans
Docker). `migrate.sh` puis `seed.sh` s'exécutent sans erreur, les deux sont rejouables sans
duplication (`ON CONFLICT` vérifié), et un scénario de bout en bout a été testé manuellement :
création d'un utilisateur, d'une recette avec 4 ingrédients CIQUAL réels (poulet 200 g / riz cru
100 g / courgette 150 g / huile d'olive 10 g), calcul des macros totales et par portion, création
d'une adaptation (grammages modifiés) avec comptage `original_recipe_id` et diff calorique, et
vérification qu'une contrainte `CHECK` (auto-abonnement) rejette bien une ligne invalide.

Un bug a été trouvé et corrigé pendant ce test : `seeds/0002_unit_equivalences.sql` ciblait
`ON CONFLICT (food_id, unit)`, qui ne protège jamais les lignes à `food_id NULL` (NULL ≠ NULL en
SQL standard, donc jamais "en conflit" au sens de cette contrainte). La vraie contrainte
d'unicité pour ces lignes génériques est l'index partiel `idx_food_unit_equiv_generic`
(`unit` WHERE `food_id IS NULL`) : le seed cible maintenant `ON CONFLICT (unit) WHERE food_id IS
NULL DO NOTHING`, et rejouer le seed ne duplique plus rien.

## Pourquoi relationnel

Le cœur du produit est un calcul agrégé (recette = somme de N ingrédients × leur valeur
nutritionnelle) avec beaucoup de jointures (utilisateurs, likes, commentaires, collections,
filtres multi-critères). C'est le cas d'usage typique du relationnel ; un document store
obligerait à dupliquer les données nutritionnelles dans chaque recette ou à faire des
agrégations applicatives coûteuses.

## Décisions de modélisation clés

**1. Les adaptations sont des recettes ("fork"), pas une structure de diff séparée.**
`recipes.original_recipe_id` référence la recette source. Une adaptation (grammages modifiés,
substitution, changement de portions, duplication libre) est une ligne `recipes` à part entière,
avec sa propre liste `recipe_ingredients`. Avantages :
- réutilise tout le pipeline de calcul de macros sans code séparé ;
- `COUNT(*) FROM recipes WHERE original_recipe_id = X` donne directement "adapté 126 fois" ;
- le crédit du créateur original et l'affichage "Inspiré de…" viennent gratuitement de la FK.

Coût : duplication des lignes d'ingrédients entre original et adaptation. Acceptable vu les
volumes (dizaines de lignes par recette, pas des millions).

**2. Cache dénormalisé des macros sur `recipes`.**
`total_calories_kcal`, `total_protein_g`, etc. sont stockés sur la recette et recalculés par
l'application (ou un trigger) à chaque écriture de `recipe_ingredients`. Le recalcul "en temps
réel" pendant l'édition (fenêtre d'adaptation) se fait côté application à partir des données en
mémoire, sans aller-retour DB — on n'écrit qu'à l'enregistrement. Ça évite de sommer N lignes à
chaque affichage du fil d'actualité.

**3. Unité pivot = gramme, avec table d'équivalence.**
`food_unit_equivalences` porte soit une règle générique (`food_id NULL`, ex. 1 c. à soupe = 15 ml,
valable pour tous les aliments), soit une règle spécifique à un aliment (ex. 1 "unité" d'œuf =
50 g) qui la prévaut. Le flag `is_approximate` permet d'afficher l'avertissement demandé dans le
brief (§9) quand l'équivalence n'est pas exacte.

**4. Objectifs nutritionnels historisés.**
`user_nutrition_targets` garde une ligne par changement d'objectif (`valid_from`/`valid_to`)
plutôt que d'écraser une colonne sur `users`. Permet de comparer le journal alimentaire à
l'objectif qui était actif à la date de l'entrée, pas à l'objectif actuel.

**5. Vérification communautaire des aliments.**
`foods.verification_status` (`non_verifie` / `verifie` / `signale`) + `verified_by`/`verified_at`
couvre le worfklow décrit en §8 : un utilisateur peut ajouter un aliment manquant, il reste
"non vérifié" jusqu'à validation admin, et peut être signalé par la communauté (table `reports`
avec `target_type = 'aliment'`).

**6. Signalements polymorphes.**
`reports.target_type` + `target_id` (sans FK stricte, car la cible change de table selon le type)
couvre les 4 cas du brief : recette, commentaire, aliment, utilisateur. Le contrôle d'intégrité
référentielle sur `target_id` est délégué à l'application (compromis classique pour un modèle
polymorphe en SQL — l'alternative, une FK par type de cible, complique inutilement les écritures
pour un gain marginal ici).

**7. Substitutions "intelligentes".**
`food_substitution_suggestions` est une table de correspondances curées (admin ou communauté
validée) taguées par raison (`moins_calorique`, `plus_proteine`, `vegetarien`, `sans_lactose`…),
consommée par le module "Remplacer cet aliment" (§5.6) pour proposer des alternatives sans
recherche floue à chaque fois.

## Ce qui est MVP vs v2

Le schéma couvre tout (MVP §14 + v2), pour éviter une migration de refonte plus tard. En v1,
les tables suivantes peuvent rester vides / non exposées côté produit : `food_diary_entries`,
`user_nutrition_targets` (utilisée seulement par les recommandations avancées), `subscriptions`,
`food_substitution_suggestions` (le remplacement peut démarrer en v1 avec une simple recherche
texte sur `foods`, sans suggestions "intelligentes").

## Non couvert ici (à trancher séparément)

- Programmes alimentaires et espace privé coach/client (§13) — nécessite son propre jeu de
  tables (`coach_programs`, `coach_clients`) une fois le besoin pro priorisé.
- Recherche plein texte avancée / vectorielle sur les recettes — `pg_trgm` suffit pour le MVP,
  un moteur dédié (Meilisearch, Elasticsearch) sera pertinent au-delà.
- Scan code-barres (`foods.barcode` existe déjà, prêt à l'usage) et reconnaissance photo — v2.

## Seed CIQUAL 2020 (`seeds/0003_ciqual_foods.sql`)

Importé depuis la table de composition nutritionnelle Ciqual 2020 de l'ANSES (licence ouverte,
[data.gouv.fr](https://www.data.gouv.fr/datasets/table-de-composition-nutritionnelle-des-aliments-ciqual-2020)),
généré par un script Node ad hoc (non conservé dans le repo — le fichier SQL produit l'est).

- **3 092 aliments importés** sur 3 186 lignes source ; **94 écartées** faute de valeur mesurée
  pour l'énergie, les protéines, les glucides ou les lipides (colonnes `NOT NULL` de `foods`).
- **794 de ces 3 092** (~26 %) n'avaient aucune valeur d'énergie mesurée dans CIQUAL (fréquent
  pour les plats composés) : leurs calories sont **calculées via la formule d'Atwater**
  (protéines×4 + glucides×4 + lipides×9), et leur colonne `source` porte le suffixe
  `"— énergie estimée (Atwater)"` pour rester traçable. Les autres utilisent la valeur officielle
  "Règlement UE 1169/2011" ou, à défaut, celle du facteur de Jones.
- Le **sodium** n'est pas fourni nativement par CIQUAL : il est dérivé du sel (`sodium_mg = sel_g
  × 400`), formule standard de l'étiquetage nutritionnel.
- L'**état cru/cuit** (`foods.state`) est déduit du libellé français par une heuristique texte
  (recherche de "cru"/"cuit" dans le nom) — fiable dans la majorité des cas mais à vérifier
  ponctuellement, notamment pour les libellés composés ou ambigus.
- Les 12 valeurs de `food_categories` (seed 0001) reprennent **exactement** les groupes de niveau 1
  CIQUAL (`alim_grp_nom_fr`), pour que l'import rattache chaque aliment par simple jointure sur le
  nom sans mapping approximatif à maintenir.
- Idempotent via `foods.source_ref` (l'`alim_code` CIQUAL) : une contrainte unique partielle
  `(source, source_ref) WHERE source_ref IS NOT NULL` permet le `ON CONFLICT DO NOTHING`, donc
  rejouer `seed.sh` ne duplique rien.

Ce seed ne couvre que les aliments **génériques** (crus/cuits/plats maison) — pas de produits de
marque avec code-barres. C'est volontaire : voir le choix "CIQUAL uniquement" ci-dessus, cohérent
avec les exemples du brief (poulet, riz, courgette...). Un import Open Food Facts pourra être
ajouté plus tard en seed séparé (`0004_open_food_facts_sample.sql`) sans toucher à celui-ci.

## Prochaines étapes suggérées

1. Écrire la fonction/trigger de recalcul des totaux de `recipes` à partir de `recipe_ingredients`
   (ou l'implémenter côté application si le calcul doit aussi tourner côté client avant sauvegarde).
   Testé manuellement en SQL brut lors de la validation — la requête d'agrégation fonctionne, reste
   à l'automatiser.
2. Vérifier manuellement un échantillon de l'heuristique cru/cuit et des lignes à énergie estimée
   avant de les exposer publiquement comme "vérifiées" — envisager de repasser certaines en
   `non_verifie` si leur usage en recette est sensible.
3. Provisionner une vraie base Postgres pour le développement (Docker local, Supabase, Neon...) —
   la validation ci-dessus a tourné sur une instance locale temporaire, supprimée après coup.
