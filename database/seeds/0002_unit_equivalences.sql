-- =====================================================================
-- Seed 0002 — Équivalences d'unité génériques (§9 du brief)
-- Ces lignes ont food_id = NULL : elles s'appliquent à tout aliment qui
-- n'a pas sa propre équivalence spécifique dans food_unit_equivalences.
-- =====================================================================

INSERT INTO food_unit_equivalences (food_id, unit, grams_equivalent, is_approximate) VALUES
    (NULL, 'millilitre',        1,   FALSE),  -- 1 ml d'eau ≈ 1 g (approximation pivot pour les liquides)
    (NULL, 'cuillere_a_soupe', 15,   TRUE),
    (NULL, 'cuillere_a_cafe',   5,   TRUE),
    (NULL, 'verre',           200,   TRUE),
    (NULL, 'tasse',           250,   TRUE)
-- Cible l'index partiel idx_food_unit_equiv_generic : la contrainte
-- UNIQUE(food_id, unit) de la table ne suffit pas ici, deux lignes à
-- food_id NULL n'étant jamais considérées en conflit par elle (NULL <> NULL
-- en SQL standard).
ON CONFLICT (unit) WHERE food_id IS NULL DO NOTHING;

-- 'unite', 'tranche' et 'portion' n'ont pas d'équivalence générique
-- fiable (dépend entièrement de l'aliment) : elles doivent être définies
-- au cas par cas sur food_unit_equivalences.food_id lors de l'ajout de
-- l'aliment (ex. 1 unité d'œuf = 50 g, 1 tranche de pain de mie = 25 g).
