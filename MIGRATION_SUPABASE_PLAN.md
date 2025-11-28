# Plan de Migration vers Supabase + Distribution Google Play

## 🎯 Objectifs
1. Migrer de PostgreSQL local + Prisma vers Supabase
2. Simplifier l'architecture backend
3. Préparer pour distribution Google Play Store (PWA ou TWA)

## 📋 Phase 1 : Configuration Supabase

### 1.1 Créer/Configurer le projet Supabase
- [ ] Créer un projet sur https://supabase.com
- [ ] Noter les credentials :
  - Project URL
  - Anon Key
  - Service Role Key
  - Database Password

### 1.2 Migrer le schéma de base de données
- [ ] Exporter le schéma Prisma actuel
- [ ] Créer les tables dans Supabase SQL Editor :
  ```sql
  -- Table users (gérée par Supabase Auth)
  -- Table ringtones
  CREATE TABLE ringtones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    format TEXT NOT NULL,
    duration INTEGER NOT NULL,
    size_bytes INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    waveform JSONB,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Index pour performance
  CREATE INDEX idx_ringtones_user_id ON ringtones(user_id);
  CREATE INDEX idx_ringtones_created_at ON ringtones(created_at DESC);
  
  -- Row Level Security (RLS)
  ALTER TABLE ringtones ENABLE ROW LEVEL SECURITY;
  
  -- Policy : les utilisateurs ne voient que leurs sonneries
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

### 1.3 Configurer le Storage Supabase
- [ ] Créer un bucket `ringtones` dans Storage
- [ ] Configurer les policies :
  - Public read pour les fichiers audio
  - Authenticated write pour upload
- [ ] Limiter la taille max (10MB par fichier)

## 📋 Phase 2 : Nettoyage du Code Backend

### 2.1 Fichiers à SUPPRIMER
```
server/
  ├── prisma/                    # ❌ Plus besoin (Supabase gère la DB)
  ├── prisma.config.ts           # ❌ Plus besoin
  ├── docker-compose.yml         # ❌ Plus besoin (Supabase héberge)
  └── api/src/
      ├── prisma/                # ❌ Supprimer tout le module Prisma
      ├── config/                 # ⚠️ Simplifier (garder pour env vars)
      └── upload/                 # ⚠️ Adapter pour Supabase Storage
```

### 2.2 Fichiers à MODIFIER
- `server/api/src/auth/` → Utiliser Supabase Auth
- `server/api/src/ringtones/` → Utiliser Supabase Client
- `server/api/src/upload/` → Utiliser Supabase Storage
- `server/api/package.json` → Retirer Prisma, ajouter Supabase

## 📋 Phase 3 : Nouveau Backend avec Supabase

### 3.1 Installation des dépendances
```bash
cd server/api
npm uninstall @prisma/client prisma
npm install @supabase/supabase-js
```

### 3.2 Nouveau service Supabase
Créer `server/api/src/supabase/supabase.service.ts` :
- Client Supabase avec Service Role Key (backend)
- Méthodes pour DB, Auth, Storage

### 3.3 Adapter Auth Service
- Utiliser Supabase Auth au lieu de JWT custom
- Les tokens sont gérés par Supabase

### 3.4 Adapter Ringtones Service
- Utiliser Supabase Client pour les requêtes
- Utiliser RLS (Row Level Security) pour la sécurité

### 3.5 Adapter Upload Service
- Upload vers Supabase Storage
- Générer URLs signées pour téléchargement

## 📋 Phase 4 : Frontend avec Supabase

### 4.1 Installation
```bash
npm install @supabase/supabase-js
```

### 4.2 Nouveau client Supabase
Créer `src/services/supabase/client.ts` :
- Client avec Anon Key (frontend)
- Configuration pour Auth, DB, Storage

### 4.3 Adapter les stores
- `authStore.ts` → Utiliser Supabase Auth
- `ringtoneStore.ts` → Utiliser Supabase Client

### 4.4 Supprimer les services API REST
- `src/services/api/` → Remplacer par Supabase direct

## 📋 Phase 5 : PWA pour Google Play Store

### 5.1 Configuration PWA
- [ ] `manifest.json` complet
- [ ] Service Worker avec Workbox
- [ ] Icons (192x192, 512x512)
- [ ] Splash screen
- [ ] Mode offline basique

### 5.2 Trusted Web Activity (TWA)
- [ ] Créer un wrapper Android minimal
- [ ] Utiliser Bubblewrap ou PWA Builder
- [ ] Configurer pour Google Play Store

### 5.3 Optimisations
- [ ] Compression des assets
- [ ] Lazy loading
- [ ] Code splitting
- [ ] Optimisation des images

## 📋 Phase 6 : Tests et Déploiement

### 6.1 Tests
- [ ] Tests d'authentification
- [ ] Tests upload/download
- [ ] Tests offline
- [ ] Tests sur mobile

### 6.2 Déploiement
- [ ] Frontend : Vercel/Netlify
- [ ] Variables d'environnement configurées
- [ ] Build de production testé

### 6.3 Google Play Store
- [ ] Créer compte développeur
- [ ] Préparer les assets (screenshots, description)
- [ ] Build TWA
- [ ] Soumettre l'application

## 🔄 Ordre d'exécution recommandé

1. **Configurer Supabase** (Phase 1)
2. **Nettoyer le code backend** (Phase 2)
3. **Migrer le backend** (Phase 3)
4. **Migrer le frontend** (Phase 4)
5. **Préparer PWA/TWA** (Phase 5)
6. **Tester et déployer** (Phase 6)

## 📝 Notes importantes

- **Supabase Auth** remplace complètement JWT custom
- **Supabase Storage** remplace l'upload local
- **RLS (Row Level Security)** remplace les guards NestJS pour la sécurité DB
- **Pas besoin de backend NestJS** si on utilise Supabase directement depuis le frontend
- **Option** : Garder un backend minimal pour logique métier complexe

## 🎯 Architecture finale

```
Frontend (React + Vite)
  ↓
Supabase Client (Auth + DB + Storage)
  ↓
Supabase (PostgreSQL + Auth + Storage)
```

**OU** (si backend nécessaire) :

```
Frontend (React + Vite)
  ↓
Backend NestJS minimal
  ↓
Supabase (via Service Role)
```

