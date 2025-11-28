# Migration Supabase - État d'avancement

## ✅ Terminé

1. **Backend NestJS migré vers Supabase**
   - ✅ Service Supabase créé (`server/api/src/supabase/`)
   - ✅ Auth service adapté pour utiliser Supabase Auth
   - ✅ Ringtones service adapté pour utiliser Supabase DB
   - ✅ Upload service adapté pour utiliser Supabase Storage
   - ✅ Guard d'authentification Supabase créé
   - ✅ Modules mis à jour (AuthModule, RingtonesModule, UploadModule, AppModule)
   - ✅ Fichiers Prisma supprimés

2. **Frontend migré vers Supabase**
   - ✅ Client Supabase créé (`src/services/supabase/client.ts`)
   - ✅ Services Supabase créés (auth, ringtones)
   - ✅ Stores adaptés (authStore, ringtoneStore)
   - ✅ App.tsx mis à jour pour gérer l'auth Supabase
   - ✅ Build frontend réussi

3. **Fichiers de configuration**
   - ✅ `.env.example` créé pour backend et frontend
   - ✅ Migration SQL créée (`supabase/migrations/001_initial_schema.sql`)

## 📋 À faire manuellement

### 1. Créer le bucket Storage dans Supabase

1. Aller dans **Storage** dans le dashboard Supabase
2. Cliquer sur **New bucket**
3. Nom: `ringtones`
4. Public: ✅ **Oui** (pour que les fichiers soient accessibles publiquement)
5. File size limit: 10 MB (ou plus selon vos besoins)
6. Allowed MIME types: `audio/*,video/*`

### 2. Exécuter la migration SQL

1. Aller dans **SQL Editor** dans le dashboard Supabase
2. Copier le contenu de `supabase/migrations/001_initial_schema.sql`
3. Coller dans l'éditeur SQL
4. Cliquer sur **Run**

### 3. Configurer les variables d'environnement

#### Backend (`server/api/.env`)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=3000
```

#### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Tester l'application

1. Démarrer le backend: `cd server/api && npm run start:dev`
2. Démarrer le frontend: `npm run dev`
3. Tester l'inscription/connexion
4. Tester l'enregistrement et l'upload d'une sonnerie

## 🗑️ Fichiers à supprimer (optionnel)

Si vous êtes sûr que tout fonctionne, vous pouvez supprimer:
- `server/prisma/` (dossier Prisma)
- `server/api/src/services/api/` (anciens services REST, si vous n'utilisez plus le backend NestJS)
- `docker-compose.yml` (si vous aviez un setup PostgreSQL local)

## 📝 Notes importantes

- **RLS (Row Level Security)** est activé sur la table `ringtones`. Les utilisateurs ne peuvent accéder qu'à leurs propres données.
- Le **Service Role Key** est utilisé côté backend pour bypasser RLS si nécessaire.
- L'**Anon Key** est utilisée côté frontend et respecte les policies RLS.
- Les fichiers audio sont stockés dans Supabase Storage dans le bucket `ringtones`.

## 🚀 Prochaines étapes

1. Configurer Supabase (bucket + migration SQL)
2. Ajouter les variables d'environnement
3. Tester l'application
4. Configurer la PWA pour Google Play Store (TWA)

