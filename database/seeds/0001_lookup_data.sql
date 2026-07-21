-- =====================================================================
-- Seed 0001 — Données de référence (tables lookup)
-- Rejouable sans risque (ON CONFLICT DO NOTHING sur les colonnes uniques).
-- =====================================================================

-- 14 allergènes à déclaration obligatoire (réglementation UE 1169/2011)
INSERT INTO allergens (name) VALUES
    ('gluten'), ('crustacés'), ('œufs'), ('poissons'), ('arachides'),
    ('soja'), ('lait'), ('fruits à coque'), ('céleri'), ('moutarde'),
    ('graines de sésame'), ('sulfites'), ('lupin'), ('mollusques')
ON CONFLICT (name) DO NOTHING;

INSERT INTO dietary_preferences (name) VALUES
    ('vegetarien'), ('vegan'), ('pescetarien'), ('omnivore'),
    ('sans_gluten'), ('sans_lactose'), ('halal'), ('kasher'),
    ('faible_en_glucides')
ON CONFLICT (name) DO NOTHING;

-- Groupes alimentaires : reprend exactement les 12 groupes de niveau 1 de
-- la table CIQUAL 2020 (colonne alim_grp_nom_fr), pour que l'import des
-- aliments (seed 0003) puisse rattacher chaque ligne par simple jointure
-- sur le nom, sans mapping approximatif.
INSERT INTO food_categories (name) VALUES
    ('aliments moyens (divers)'),                              -- groupe CIQUAL 00
    ('entrées et plats composés'),                             -- groupe CIQUAL 01
    ('fruits, légumes, légumineuses et oléagineux'),            -- groupe CIQUAL 02
    ('produits céréaliers'),                                    -- groupe CIQUAL 03
    ('viandes, œufs, poissons et assimilés'),                   -- groupe CIQUAL 04
    ('produits laitiers et assimilés'),                         -- groupe CIQUAL 05
    ('eaux et autres boissons'),                                -- groupe CIQUAL 06
    ('produits sucrés'),                                        -- groupe CIQUAL 07
    ('glaces et sorbets'),                                      -- groupe CIQUAL 08
    ('matières grasses'),                                       -- groupe CIQUAL 09
    ('aides culinaires et ingrédients divers'),                 -- groupe CIQUAL 10
    ('aliments infantiles')                                     -- groupe CIQUAL 11
ON CONFLICT (name) DO NOTHING;

-- Catégorie = type de repas (une seule par recette)
INSERT INTO recipe_categories (name) VALUES
    ('petit_dejeuner'), ('dejeuner'), ('diner'),
    ('collation'), ('dessert'), ('repas_post_entrainement')
ON CONFLICT (name) DO NOTHING;

-- Tags = descripteurs libres, plusieurs par recette (§5.9 du brief)
INSERT INTO recipe_tags (name) VALUES
    ('riche_en_proteines'), ('faible_en_calories'), ('vegetarien'),
    ('vegan'), ('rapide'), ('meal_prep'), ('sans_gluten'),
    ('sans_lactose'), ('prise_de_masse'), ('perte_de_poids')
ON CONFLICT (name) DO NOTHING;
