-- =====================================================================
-- Migration 0001 — Extensions et types énumérés
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- recherche floue (nom de recette/aliment)
CREATE EXTENSION IF NOT EXISTS citext;     -- email/pseudo insensibles à la casse

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
