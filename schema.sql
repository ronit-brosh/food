-- ===========================
-- Recipes App - Database Schema
-- ===========================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Main recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  prep_time_minutes INT,
  servings      INT,
  ingredients   TEXT NOT NULL,       -- stored as markdown/freetext
  instructions  TEXT NOT NULL,       -- stored as markdown/freetext
  variations    TEXT,
  source_url    TEXT,
  image_url     TEXT,
  rating        NUMERIC(2,1) CHECK (rating >= 1 AND rating <= 5),
  rating_count  INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Labels table
CREATE TABLE IF NOT EXISTS labels (
  id    SERIAL PRIMARY KEY,
  name  TEXT UNIQUE NOT NULL
);

-- Many-to-many: recipe <-> labels
CREATE TABLE IF NOT EXISTS recipe_labels (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  label_id  INT  REFERENCES labels(id)  ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, label_id)
);

-- Auto-update updated_at on recipe changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipes_name       ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_labels_recipe ON recipe_labels(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_labels_label  ON recipe_labels(label_id);
