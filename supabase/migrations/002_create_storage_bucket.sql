-- Migration Supabase : Configuration Storage pour les sonneries
-- À exécuter dans Supabase SQL Editor après création du bucket manuellement

-- Policies pour le bucket 'ringtones'
-- Note: Le bucket doit être créé manuellement dans l'interface Supabase Storage

-- Policy pour upload (utilisateurs authentifiés)
DROP POLICY IF EXISTS "Authenticated users can upload ringtones" ON storage.objects;
CREATE POLICY "Authenticated users can upload ringtones"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ringtones' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy pour lecture (public - pour téléchargement)
DROP POLICY IF EXISTS "Public can read ringtones" ON storage.objects;
CREATE POLICY "Public can read ringtones"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ringtones');

-- Policy pour mise à jour (propriétaire uniquement)
DROP POLICY IF EXISTS "Users can update own ringtones" ON storage.objects;
CREATE POLICY "Users can update own ringtones"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ringtones' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy pour suppression (propriétaire uniquement)
DROP POLICY IF EXISTS "Users can delete own ringtones" ON storage.objects;
CREATE POLICY "Users can delete own ringtones"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ringtones' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

