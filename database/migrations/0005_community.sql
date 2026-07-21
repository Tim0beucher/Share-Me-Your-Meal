-- =====================================================================
-- Migration 0005 — Interactions communautaires
-- =====================================================================

CREATE TABLE recipe_likes (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, recipe_id)
);
CREATE INDEX idx_recipe_likes_recipe ON recipe_likes(recipe_id);

CREATE TABLE recipe_saves (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, recipe_id)
);
CREATE INDEX idx_recipe_saves_recipe ON recipe_saves(recipe_id);

CREATE TABLE comments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id          UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL REFERENCES users(id),
    parent_comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
    content            TEXT NOT NULL,
    is_hidden          BOOLEAN NOT NULL DEFAULT FALSE,   -- modération
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);
CREATE INDEX idx_comments_recipe ON comments(recipe_id) WHERE deleted_at IS NULL;

CREATE TABLE comment_mentions (
    comment_id        UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (comment_id, mentioned_user_id)
);

CREATE TABLE collections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,             -- "Recettes pour la semaine", "Prise de masse"...
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
);

CREATE TABLE collection_recipes (
    collection_id  UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    recipe_id      UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, recipe_id)
);
