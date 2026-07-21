-- =====================================================================
-- Migration 0006 — Journal alimentaire (v2, rattaché ici pour cohérence
-- du modèle avec les tables recettes/aliments dont il dépend)
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
