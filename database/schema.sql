-- =====================================================================
-- Schéma de base de données — Application communautaire de recettes
-- et de calcul de macros
--
-- Moteur cible : PostgreSQL 15+
-- Convention : clés primaires UUID, timestamps en UTC (timestamptz),
-- suppression logique (deleted_at) sur les entités soumises au RGPD.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- recherche floue (nom de recette/aliment)
CREATE EXTENSION IF NOT EXISTS citext;     -- email/pseudo insensibles à la casse

-- =====================================================================
-- 1. ENUMS
-- =====================================================================

CREATE TYPE auth_provider AS ENUM ('email', 'google', 'apple', 'facebook');

CREATE TYPE user_role AS ENUM ('user', 'creator', 'coach', 'admin');

CREATE TYPE nutrition_goal AS ENUM (
    'perte_de_poids',
    'maintien_du_poids',
    'prise_de_masse',
    'alimentation_equilibree',
    'performance_sportive'
);

CREATE TYPE difficulty_level AS ENUM ('facile', 'moyen', 'difficile');

CREATE TYPE meal_category AS ENUM (
    'petit_dejeuner', 'dejeuner', 'diner', 'collation',
    'dessert', 'post_entrainement'
);

-- Unité utilisée pour un ingrédient. Le gramme/millilitre restent
-- l'unité de calcul pivot ; les autres unités passent par une table
-- d'équivalence (food_unit_equivalences).
CREATE TYPE measurement_unit AS ENUM (
    'gramme', 'millilitre', 'cuillere_a_soupe', 'cuillere_a_cafe',
    'portion', 'unite', 'tranche', 'verre', 'tasse'
);

CREATE TYPE food_state AS ENUM ('cru', 'cuit', 'generique', 'produit_de_marque');

CREATE TYPE food_verification_status AS ENUM ('non_verifie', 'verifie', 'signale');

CREATE TYPE recipe_status AS ENUM ('brouillon', 'publiee', 'masquee', 'supprimee');

CREATE TYPE recipe_visibility AS ENUM ('publique', 'privee');

-- Nature d'une recette dérivée : garde une trace du "pourquoi" du fork,
-- utile pour l'affichage ("adapté depuis…", "portions modifiées"…).
CREATE TYPE adaptation_type AS ENUM (
    'grammage', 'portions', 'substitution_ingredient', 'duplication_libre'
);

CREATE TYPE report_target_type AS ENUM ('recette', 'commentaire', 'aliment', 'utilisateur');

CREATE TYPE report_status AS ENUM ('en_attente', 'traite', 'rejete');

CREATE TYPE subscription_plan AS ENUM ('gratuit', 'premium', 'coach');

CREATE TYPE subscription_status AS ENUM ('active', 'expiree', 'annulee');

-- =====================================================================
-- 2. UTILISATEURS ET PROFILS
-- =====================================================================

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               CITEXT UNIQUE NOT NULL,
    password_hash       TEXT,                          -- NULL si auth 100% OAuth
    auth_provider       auth_provider NOT NULL DEFAULT 'email',
    pseudo              CITEXT UNIQUE NOT NULL,
    avatar_url          TEXT,
    bio                 TEXT,
    role                user_role NOT NULL DEFAULT 'user',
    is_verified_creator BOOLEAN NOT NULL DEFAULT FALSE,
    -- Espace personnel : coordonnées et données morphologiques facultatives
    phone_number        TEXT,
    sex                  TEXT CHECK (sex IN ('femme', 'homme', 'autre')),
    birth_date           DATE,
    height_cm            NUMERIC(5,1) CHECK (height_cm > 0),
    weight_kg            NUMERIC(5,1) CHECK (weight_kg > 0),
    accent_color          TEXT CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$'), -- préférence de thème (couleur d'accent)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ                     -- soft delete RGPD
);

-- Historisé : un utilisateur peut changer d'objectif au fil du temps ;
-- seule la ligne la plus récente (valid_to IS NULL) est "active".
CREATE TABLE user_nutrition_targets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal                    nutrition_goal NOT NULL,
    daily_calories_target   NUMERIC(6,1),
    daily_protein_g_target  NUMERIC(6,1),
    daily_carbs_g_target    NUMERIC(6,1),
    daily_fat_g_target      NUMERIC(6,1),
    valid_from              TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to                TIMESTAMPTZ
);
CREATE INDEX idx_user_nutrition_targets_active
    ON user_nutrition_targets(user_id) WHERE valid_to IS NULL;

CREATE TABLE allergens (
    id      SMALLSERIAL PRIMARY KEY,
    name    TEXT UNIQUE NOT NULL          -- gluten, lactose, arachide, fruits à coque...
);

CREATE TABLE dietary_preferences (
    id      SMALLSERIAL PRIMARY KEY,
    name    TEXT UNIQUE NOT NULL          -- vegetarien, vegan, sans_gluten, halal...
);

CREATE TABLE user_allergens (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allergen_id SMALLINT NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, allergen_id)
);

CREATE TABLE user_dietary_preferences (
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dietary_preference_id   SMALLINT NOT NULL REFERENCES dietary_preferences(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, dietary_preference_id)
);

CREATE TABLE follows (
    follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id <> followee_id)
);
CREATE INDEX idx_follows_followee ON follows(followee_id);

-- =====================================================================
-- 3. BASE DE DONNÉES NUTRITIONNELLE (ALIMENTS)
-- =====================================================================

CREATE TABLE food_categories (
    id      SMALLSERIAL PRIMARY KEY,
    name    TEXT UNIQUE NOT NULL          -- viandes, féculents, légumes, produits laitiers...
);

-- Toutes les valeurs sont rapportées à 100 g (ou 100 ml pour les liquides,
-- convertis en équivalent gramme via food_unit_equivalences).
CREATE TABLE foods (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                        TEXT NOT NULL,
    brand                       TEXT,                      -- NULL pour un aliment générique
    state                       food_state NOT NULL DEFAULT 'generique',
    category_id                 SMALLINT REFERENCES food_categories(id),
    calories_kcal_per_100g      NUMERIC(7,2) NOT NULL CHECK (calories_kcal_per_100g >= 0),
    protein_g_per_100g          NUMERIC(6,2) NOT NULL CHECK (protein_g_per_100g >= 0),
    carbs_g_per_100g            NUMERIC(6,2) NOT NULL CHECK (carbs_g_per_100g >= 0),
    fat_g_per_100g              NUMERIC(6,2) NOT NULL CHECK (fat_g_per_100g >= 0),
    fiber_g_per_100g            NUMERIC(6,2),
    sugar_g_per_100g            NUMERIC(6,2),
    saturated_fat_g_per_100g    NUMERIC(6,2),
    salt_g_per_100g             NUMERIC(6,2),
    sodium_mg_per_100g          NUMERIC(7,2),
    barcode                     TEXT,                      -- v2 : scan code-barres
    label_photo_url             TEXT,                      -- photo de l'étiquette (aliment ajouté par un user)
    verification_status         food_verification_status NOT NULL DEFAULT 'non_verifie',
    verified_by                 UUID REFERENCES users(id),
    verified_at                 TIMESTAMPTZ,
    created_by                  UUID REFERENCES users(id), -- NULL si aliment "de base" importé (ex. table CIQUAL/OFF)
    source                      TEXT,                      -- ex. "CIQUAL", "Open Food Facts", "saisie utilisateur"
    source_ref                  TEXT,                      -- identifiant dans la source externe (ex. alim_code CIQUAL), pour un import idempotent
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_foods_name_trgm ON foods USING gin (name gin_trgm_ops);
CREATE INDEX idx_foods_verification_status ON foods(verification_status);
CREATE UNIQUE INDEX idx_foods_barcode ON foods(barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX idx_foods_source_ref ON foods(source, source_ref) WHERE source_ref IS NOT NULL;

CREATE TABLE food_allergens (
    food_id     UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    allergen_id SMALLINT NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
    PRIMARY KEY (food_id, allergen_id)
);

-- Équivalences d'unité -> grammes. Une ligne food_id = NULL définit une
-- équivalence générique (ex. 1 c. à soupe = 15 ml) ; une ligne avec food_id
-- définit une équivalence propre à cet aliment (ex. 1 "unité" d'œuf = 50 g)
-- qui prévaut sur la règle générique pour la même unité.
CREATE TABLE food_unit_equivalences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id         UUID REFERENCES foods(id) ON DELETE CASCADE,
    unit            measurement_unit NOT NULL,
    grams_equivalent NUMERIC(7,2) NOT NULL CHECK (grams_equivalent > 0),
    is_approximate  BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (food_id, unit)
);
CREATE UNIQUE INDEX idx_food_unit_equiv_generic
    ON food_unit_equivalences(unit) WHERE food_id IS NULL;

-- Aliments qu'un utilisateur ne veut jamais voir proposés/recommandés.
CREATE TABLE user_excluded_foods (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_id     UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, food_id)
);

-- Suggestions de substitution "curées" (admin ou communauté validée) pour
-- alimenter le module "Remplacer cet aliment" (alternatives moins
-- caloriques, plus protéinées, végétariennes, sans allergène...).
CREATE TABLE food_substitution_suggestions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id             UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    suggested_food_id   UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    reason_tag          TEXT NOT NULL,   -- 'moins_calorique' | 'plus_proteine' | 'vegetarien' | 'sans_lactose' ...
    approved            BOOLEAN NOT NULL DEFAULT FALSE,
    created_by           UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (food_id <> suggested_food_id)
);
CREATE INDEX idx_food_substitutions_food ON food_substitution_suggestions(food_id) WHERE approved;

-- =====================================================================
-- 4. RECETTES
--
-- Modèle "fork" : une adaptation (grammages modifiés, substitution,
-- changement de portions, duplication) est une recette à part entière
-- qui référence sa recette d'origine via original_recipe_id. Cela évite
-- une structure "diff" séparée, permet de réutiliser tout le pipeline de
-- calcul de macros, et rend triviale la requête "combien de fois cette
-- recette a-t-elle été adaptée" (COUNT(*) WHERE original_recipe_id = X).
-- =====================================================================

CREATE TABLE recipe_categories (
    id      SMALLSERIAL PRIMARY KEY,
    name    TEXT UNIQUE NOT NULL          -- correspond globalement à meal_category + libellés custom
);

CREATE TABLE recipe_tags (
    id      SMALLSERIAL PRIMARY KEY,
    name    TEXT UNIQUE NOT NULL          -- riche_en_proteines, faible_en_calories, rapide, meal_prep...
);

CREATE TABLE recipes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id           UUID NOT NULL REFERENCES users(id),
    title               TEXT NOT NULL,
    description         TEXT,
    cover_photo_url     TEXT,
    category_id         SMALLINT REFERENCES recipe_categories(id),
    meal_category        meal_category,
    difficulty          difficulty_level,
    prep_time_minutes   SMALLINT CHECK (prep_time_minutes >= 0),
    cook_time_minutes   SMALLINT CHECK (cook_time_minutes >= 0),
    servings            SMALLINT NOT NULL DEFAULT 1 CHECK (servings > 0),
    tips_and_variants   TEXT,
    status              recipe_status NOT NULL DEFAULT 'brouillon',
    visibility          recipe_visibility NOT NULL DEFAULT 'publique',

    -- Filiation / crédit de la recette originale
    original_recipe_id  UUID REFERENCES recipes(id),
    adaptation_type      adaptation_type,        -- NULL si recette 100% originale

    -- Cache dénormalisé des macros totales, recalculé par l'application
    -- (ou un trigger) à chaque modification de recipe_ingredients.
    -- Évite de recalculer une somme sur N lignes à chaque affichage du fil.
    total_calories_kcal      NUMERIC(8,2) NOT NULL DEFAULT 0,
    total_protein_g          NUMERIC(7,2) NOT NULL DEFAULT 0,
    total_carbs_g            NUMERIC(7,2) NOT NULL DEFAULT 0,
    total_fat_g              NUMERIC(7,2) NOT NULL DEFAULT 0,
    total_fiber_g            NUMERIC(7,2),
    total_sugar_g            NUMERIC(7,2),
    total_saturated_fat_g    NUMERIC(7,2),
    total_salt_g             NUMERIC(7,2),

    published_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,

    CHECK (original_recipe_id <> id)
);
CREATE INDEX idx_recipes_author ON recipes(author_id);
CREATE INDEX idx_recipes_original ON recipes(original_recipe_id);
CREATE INDEX idx_recipes_status_visibility ON recipes(status, visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_title_trgm ON recipes USING gin (title gin_trgm_ops);

CREATE TABLE recipe_tag_map (
    recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id     SMALLINT NOT NULL REFERENCES recipe_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, tag_id)
);

-- Ligne d'ingrédient d'une recette (ou d'une adaptation, qui a sa propre
-- liste complète). replaced_food_id permet d'afficher le comparatif
-- "Crème fraîche -> Fromage blanc" quand la ligne résulte d'une substitution.
CREATE TABLE recipe_ingredients (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id         UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    food_id           UUID NOT NULL REFERENCES foods(id),
    quantity          NUMERIC(7,2) NOT NULL CHECK (quantity > 0),
    unit              measurement_unit NOT NULL DEFAULT 'gramme',
    sort_order        SMALLINT NOT NULL DEFAULT 0,
    note              TEXT,                       -- "au choix", "facultatif"...
    replaced_food_id  UUID REFERENCES foods(id)    -- aliment remplacé, pour affichage du diff
);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_food ON recipe_ingredients(food_id);

CREATE TABLE recipe_steps (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id      UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number    SMALLINT NOT NULL,
    instruction    TEXT NOT NULL,
    photo_url      TEXT,
    UNIQUE (recipe_id, step_number)
);

-- =====================================================================
-- 5. INTERACTIONS COMMUNAUTAIRES
-- =====================================================================

CREATE TABLE recipe_likes (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, recipe_id)
);
CREATE INDEX idx_recipe_likes_recipe ON recipe_likes(recipe_id);

CREATE TABLE recipe_saves (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, recipe_id)
);
CREATE INDEX idx_recipe_saves_recipe ON recipe_saves(recipe_id);

CREATE TABLE comments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id          UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL REFERENCES users(id),
    parent_comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
    content            TEXT NOT NULL,
    is_hidden          BOOLEAN NOT NULL DEFAULT FALSE,   -- modération
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);
CREATE INDEX idx_comments_recipe ON comments(recipe_id) WHERE deleted_at IS NULL;

CREATE TABLE comment_mentions (
    comment_id        UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (comment_id, mentioned_user_id)
);

CREATE TABLE collections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,             -- "Recettes pour la semaine", "Prise de masse"...
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
);

CREATE TABLE collection_recipes (
    collection_id  UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    recipe_id      UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, recipe_id)
);

-- =====================================================================
-- 6. JOURNAL ALIMENTAIRE (v2, mais rattaché ici pour cohérence du modèle)
-- =====================================================================

CREATE TABLE food_diary_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_date      DATE NOT NULL,
    meal            meal_category NOT NULL,
    recipe_id       UUID REFERENCES recipes(id),
    servings_consumed NUMERIC(4,2),          -- utilisé si recipe_id renseigné
    food_id         UUID REFERENCES foods(id),
    quantity        NUMERIC(7,2),            -- utilisé si food_id renseigné
    unit            measurement_unit,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        (recipe_id IS NOT NULL AND food_id IS NULL) OR
        (recipe_id IS NULL AND food_id IS NOT NULL)
    )
);
CREATE INDEX idx_food_diary_user_date ON food_diary_entries(user_id, entry_date);

-- =====================================================================
-- 7. MODÉRATION
-- =====================================================================

CREATE TABLE reports (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id      UUID NOT NULL REFERENCES users(id),
    target_type      report_target_type NOT NULL,
    target_id        UUID NOT NULL,          -- polymorphe : recette, commentaire, aliment ou utilisateur
    reason           TEXT NOT NULL,
    status           report_status NOT NULL DEFAULT 'en_attente',
    resolved_by      UUID REFERENCES users(id),
    resolved_at      TIMESTAMPTZ,
    resolution_note  TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);

CREATE TABLE moderation_actions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id     UUID NOT NULL REFERENCES users(id),
    action_type  TEXT NOT NULL,              -- 'masquer_recette', 'bannir_utilisateur', 'verifier_aliment'...
    target_type  report_target_type NOT NULL,
    target_id    UUID NOT NULL,
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 8. MONÉTISATION (v2)
-- =====================================================================

CREATE TABLE subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan        subscription_plan NOT NULL DEFAULT 'gratuit',
    status      subscription_status NOT NULL DEFAULT 'active',
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ
);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- =====================================================================
-- 9. ACTIVITÉ (espace personnel)
--
-- Distinct du journal alimentaire (food_diary_entries, calorique/repas) :
-- ici on trace juste le fait qu'un utilisateur a cuisiné une recette à un
-- instant donné, pour alimenter le graphique d'activité de l'espace
-- personnel. Plusieurs lignes pour la même recette/utilisateur/jour sont
-- autorisées (on peut refaire une recette plusieurs fois le même jour).
-- =====================================================================

CREATE TABLE recipe_cook_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    cooked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipe_cook_events_user_date ON recipe_cook_events(user_id, cooked_at);

-- =====================================================================
-- 10. RÉINITIALISATION DE MOT DE PASSE
--
-- Le token brut n'est jamais stocké : seul son hash (SHA-256, entropie
-- suffisante pour ne pas nécessiter un hachage lent type bcrypt) est
-- persisté, pour qu'une fuite de la base ne suffise pas à usurper un
-- compte — il faut aussi avoir intercepté le lien envoyé par e-mail.
-- =====================================================================

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE UNIQUE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

-- =====================================================================
-- Fin du schéma MVP + extensions v2
-- =====================================================================
