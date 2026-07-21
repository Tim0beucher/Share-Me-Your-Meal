-- =====================================================================
-- Migration 0002 — Utilisateurs et profils
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
