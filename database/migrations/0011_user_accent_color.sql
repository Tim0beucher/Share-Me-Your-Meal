-- =====================================================================
-- Migration 0011 — Couleur d'accent personnalisée
--
-- Préférence de thème choisie par l'utilisateur (§ design haut de gamme) :
-- une seule couleur vive appliquée à l'action principale de l'interface,
-- le reste de la palette (fond, sémantique hausse/baisse) restant fixe.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN accent_color TEXT CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$');
