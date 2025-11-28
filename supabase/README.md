# Configuration Supabase

## 📋 Étapes de Configuration

### 1. Créer le projet Supabase
1. Aller sur https://supabase.com
2. Créer un nouveau projet
3. Noter les credentials :
   - Project URL : `https://xxxxx.supabase.co`
   - Anon Key : `eyJhbGc...`
   - Service Role Key : `eyJhbGc...`

### 2. Exécuter les migrations SQL
1. Ouvrir **SQL Editor** dans Supabase
2. Exécuter `001_create_ringtones_table.sql`
3. Créer le bucket `ringtones` dans **Storage** :
   - Nom : `ringtones`
   - Public : ✅
   - File size limit : 10MB
   - Allowed MIME types : `audio/*`
4. Exécuter `002_create_storage_bucket.sql`

### 3. Configurer les variables d'environnement

**Backend (`server/api/.env`) :**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
PORT=3000
```

**Frontend (`.env` ou `.env.local`) :**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. Structure des fichiers dans Storage
Les fichiers seront organisés ainsi :
```
ringtones/
  └── {user_id}/
      └── {timestamp}-{filename}.{ext}
```

### 5. Test de connexion
```bash
# Backend
cd server/api
npm run start:dev

# Frontend
npm run dev
```

## 🔒 Sécurité

- **RLS (Row Level Security)** : Activé sur la table `ringtones`
- **Storage Policies** : Les utilisateurs ne peuvent accéder qu'à leurs propres fichiers
- **Service Role Key** : Utilisé uniquement côté backend (jamais exposé au frontend)

