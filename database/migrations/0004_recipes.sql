-- =====================================================================
-- Migration 0004 — Recettes
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
