-- =====================================================================
-- Migration 0009 — Champs de profil personnel
--
-- Espace personnel de l'utilisateur (§ profil) : coordonnées et données
-- morphologiques facultatives, saisies volontairement par l'utilisateur.
-- Toutes nullable : rien n'est obligatoire à l'inscription.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN phone_number TEXT,
    ADD COLUMN sex          TEXT CHECK (sex IN ('femme', 'homme', 'autre')),
    ADD COLUMN birth_date   DATE,
    ADD COLUMN height_cm    NUMERIC(5,1) CHECK (height_cm > 0),
    ADD COLUMN weight_kg    NUMERIC(5,1) CHECK (weight_kg > 0);
