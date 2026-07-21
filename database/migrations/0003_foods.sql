-- =====================================================================
-- Migration 0003 — Base de données nutritionnelle (aliments)
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
