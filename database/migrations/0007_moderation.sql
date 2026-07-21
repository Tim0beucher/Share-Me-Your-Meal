-- =====================================================================
-- Migration 0007 — Modération
-- =====================================================================

CREATE TABLE reports (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id      UUID NOT NULL REFERENCES users(id),
    target_type      report_target_type NOT NULL,
    target_id        UUID NOT NULL,          -- polymorphe : recette, commentaire, aliment ou utilisateur
    reason           TEXT NOT NULL,
    status           report_status NOT NULL DEFAULT 'en_attente',
    resolved_by      UUID REFERENCES users(id),
    resolved_at      TIMESTAMPTZ,
    resolution_note  TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);

CREATE TABLE moderation_actions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id     UUID NOT NULL REFERENCES users(id),
    action_type  TEXT NOT NULL,              -- 'masquer_recette', 'bannir_utilisateur', 'verifier_aliment'...
    target_type  report_target_type NOT NULL,
    target_id    UUID NOT NULL,
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
