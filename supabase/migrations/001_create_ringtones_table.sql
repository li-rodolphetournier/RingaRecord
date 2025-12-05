-- Migration Supabase : Création de la table ringtones
-- À exécuter dans Supabase SQL Editor

-- Table ringtones
CREATE TABLE IF NOT EXISTS ringtones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  format TEXT NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0 AND duration <= 120),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  file_url TEXT NOT NULL,
  waveform JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_ringtones_user_id ON ringtones(user_id);
CREATE INDEX IF NOT EXISTS idx_ringtones_created_at ON ringtones(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE ringtones ENABLE ROW LEVEL SECURITY;

-- Policies : les utilisateurs ne voient que leurs sonneries
DROP POLICY IF EXISTS "Users can view own ringtones" ON ringtones;
CREATE POLICY "Users can view own ringtones"
  ON ringtones FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ringtones" ON ringtones;
CREATE POLICY "Users can insert own ringtones"
  ON ringtones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ringtones" ON ringtones;
CREATE POLICY "Users can update own ringtones"
  ON ringtones FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ringtones" ON ringtones;
CREATE POLICY "Users can delete own ringtones"
  ON ringtones FOR DELETE
  USING (auth.uid() = user_id);

