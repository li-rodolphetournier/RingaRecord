# Migration Supabase – État final

La stack backend locale (NestJS + Prisma + PostgreSQL) a été **retirée du dépôt**.  
Le produit repose désormais uniquement sur **Supabase (Auth + DB + Storage)** directement consommé depuis le frontend Vite.

## ✅ Ce qui est en place

1. **Frontend Supabase-first**
   - Client Supabase (`src/services/supabase/client.ts`)
   - Services Auth / Ringtones (`src/services/supabase/*.ts`)
   - Stores Zustand adaptés (`authStore`, `ringtoneStore`)
   - Pages Login / Register / Dashboard branchées sur Supabase

2. **Infrastructure Supabase**
   - Scripts SQL dans `supabase/migrations/*.sql`
   - Guides d’installation Supabase (README, quick start, troubleshooting)
   - Documentation Google Play / TWA alignée avec la nouvelle archi

3. **Nettoyage**
   - Dossier `server/` supprimé (legacy backend)
   - Prisma, docker-compose et services REST locaux retirés
   - Dossier `src/services/api/` supprimé

## 📋 À faire côté Supabase

### 1. Créer le bucket Storage
1. Dashboard Supabase → **Storage**
2. `New bucket` → nom `ringtones`, accès **public**
3. Taille max recommandée: 10 MB
4. Types autorisés: `audio/*,video/*`

### 2. Exécuter les migrations SQL
1. Dashboard → **SQL Editor**
2. Coller le contenu de `supabase/migrations/001_initial_schema.sql`
3. Lancer l’exécution (répéter pour les migrations suivantes si besoin)

### 3. Configurer l’environnement frontend
Créer un `.env` (non versionné) à la racine:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Tester l’application
1. `npm install`
2. `npm run dev`
3. Tester inscription / connexion Supabase
4. Tester enregistrement + upload + lecture de sonneries

## 📝 Notes importantes

- **RLS** doit rester actif sur la table `ringtones` (seul l’utilisateur courant voit ses données).
- Utilisez exclusivement l’**anon key** côté frontend. Pour des scripts serveur, créez un service dédié ou des Edge Functions.
- Les fichiers audio sont servis via le bucket Supabase `ringtones` (public).

## 🚀 Prochaines étapes

1. Finaliser la configuration Supabase (bucket + migrations)
2. Valider l’expérience mobile + PWA
3. Préparer la publication Google Play via TWA
4. Ajouter des tests E2E pour les flux critiques
