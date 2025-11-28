# Guide de Migration vers Supabase + Google Play Store

## 📋 Étape 1 : Configuration Supabase

### 1.1 Créer le projet Supabase
1. Aller sur https://supabase.com
2. Créer un nouveau projet
3. Noter les credentials dans `.env` :
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

### 1.2 Créer les tables dans Supabase
Ouvrir SQL Editor dans Supabase et exécuter :

```sql
-- Table ringtones (users géré par Supabase Auth)
CREATE TABLE ringtones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  format TEXT NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0 AND duration <= 40),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  file_url TEXT NOT NULL,
  waveform JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_ringtones_user_id ON ringtones(user_id);
CREATE INDEX idx_ringtones_created_at ON ringtones(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE ringtones ENABLE ROW LEVEL SECURITY;

-- Policies : les utilisateurs ne voient que leurs sonneries
CREATE POLICY "Users can view own ringtones"
  ON ringtones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ringtones"
  ON ringtones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ringtones"
  ON ringtones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ringtones"
  ON ringtones FOR DELETE
  USING (auth.uid() = user_id);
```

### 1.3 Configurer Storage
1. Aller dans Storage → Create bucket
2. Nom : `ringtones`
3. Public : ✅ (pour téléchargement)
4. File size limit : 10MB
5. Allowed MIME types : `audio/*`

**Policies Storage :**
```sql
-- Policy pour upload (authenticated users)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ringtones');

-- Policy pour lecture (public)
CREATE POLICY "Public can read ringtones"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ringtones');
```

## 📋 Étape 2 : Fichiers à SUPPRIMER

### Backend
```
server/
  ├── prisma/                    ❌ SUPPRIMER
  ├── prisma.config.ts           ❌ SUPPRIMER
  ├── docker-compose.yml         ❌ SUPPRIMER
  └── api/src/
      ├── prisma/                ❌ SUPPRIMER (tout le module)
      └── upload/                 ⚠️ MODIFIER (utiliser Supabase Storage)
```

### Frontend
```
src/services/api/                ❌ SUPPRIMER (remplacé par Supabase)
```

## 📋 Étape 3 : Nouveaux fichiers à CRÉER

### Backend
```
server/api/src/
  └── supabase/
      ├── supabase.service.ts    ✅ NOUVEAU
      └── supabase.module.ts     ✅ NOUVEAU
```

### Frontend
```
src/services/
  └── supabase/
      ├── client.ts              ✅ NOUVEAU
      └── types.ts               ✅ NOUVEAU
```

## 📋 Étape 4 : Fichiers à MODIFIER

### Backend
- `server/api/src/auth/` → Utiliser Supabase Auth
- `server/api/src/ringtones/` → Utiliser Supabase Client
- `server/api/src/upload/` → Utiliser Supabase Storage
- `server/api/package.json` → Retirer Prisma, ajouter Supabase
- `server/api/.env` → Ajouter credentials Supabase

### Frontend
- `src/stores/authStore.ts` → Utiliser Supabase Auth
- `src/stores/ringtoneStore.ts` → Utiliser Supabase Client
- `package.json` → Ajouter @supabase/supabase-js
- `.env` → Ajouter SUPABASE_URL et SUPABASE_ANON_KEY

## 📋 Étape 5 : PWA pour Google Play Store

### 5.1 Configuration PWA
- `public/manifest.json` complet
- Icons (192x192, 512x512)
- Service Worker avec Workbox
- Splash screen

### 5.2 Trusted Web Activity (TWA)
- Utiliser PWA Builder ou Bubblewrap
- Créer wrapper Android minimal
- Configurer pour Google Play Store

## 🚀 Ordre d'exécution

1. ✅ Créer projet Supabase et configurer DB + Storage
2. ✅ Supprimer code Prisma/PostgreSQL
3. ✅ Créer service Supabase backend
4. ✅ Adapter Auth + Ringtones
5. ✅ Migrer frontend
6. ✅ Configurer PWA/TWA
7. ✅ Tester et déployer

