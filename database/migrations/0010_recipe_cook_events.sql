-- =====================================================================
-- Migration 0010 — Historique "recette faite"
--
-- Distinct du journal alimentaire (food_diary_entries, calorique/repas) :
-- ici on trace juste le fait qu'un utilisateur a cuisiné une recette à un
-- instant donné, pour alimenter le graphique d'activité de l'espace
-- personnel ("recettes faites sur les 7 derniers jours", etc.). Plusieurs
-- lignes pour la même recette/utilisateur/jour sont autorisées (on peut
-- refaire une recette plusieurs fois le même jour).
-- =====================================================================

CREATE TABLE recipe_cook_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    cooked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipe_cook_events_user_date ON recipe_cook_events(user_id, cooked_at);
