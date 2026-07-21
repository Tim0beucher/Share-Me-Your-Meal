-- =====================================================================
-- Migration 0008 — Monétisation (v2)
-- =====================================================================

CREATE TABLE subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan        subscription_plan NOT NULL DEFAULT 'gratuit',
    status      subscription_status NOT NULL DEFAULT 'active',
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ
);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
