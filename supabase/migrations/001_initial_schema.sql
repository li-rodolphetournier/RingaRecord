-- Migration initiale pour RingaRecord
-- À exécuter dans l'éditeur SQL de Supabase

-- Table users (gérée par Supabase Auth, mais on peut ajouter des colonnes custom si besoin)
-- La table auth.users existe déjà dans Supabase

-- Table ringtones
CREATE TABLE IF NOT EXISTS public.ringtones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  format TEXT NOT NULL,
  duration INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  waveform JSONB,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ringtones_user_id ON public.ringtones(user_id);
CREATE INDEX IF NOT EXISTS idx_ringtones_created_at ON public.ringtones(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.ringtones ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs ne peuvent voir que leurs propres sonneries
CREATE POLICY "Users can view their own ringtones"
  ON public.ringtones
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs ne peuvent créer que leurs propres sonneries
CREATE POLICY "Users can insert their own ringtones"
  ON public.ringtones
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs ne peuvent modifier que leurs propres sonneries
CREATE POLICY "Users can update their own ringtones"
  ON public.ringtones
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs ne peuvent supprimer que leurs propres sonneries
CREATE POLICY "Users can delete their own ringtones"
  ON public.ringtones
  FOR DELETE
  USING (auth.uid() = user_id);

