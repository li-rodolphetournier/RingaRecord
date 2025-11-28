# Guide : Comment récupérer les informations Supabase

## 📋 Étape 1 : Créer un compte Supabase

1. **Aller sur https://supabase.com**
2. Cliquer sur **"Start your project"** ou **"Sign in"**
3. Se connecter avec GitHub, Google, ou créer un compte email

## 📋 Étape 2 : Créer un nouveau projet

1. Une fois connecté, cliquer sur **"New Project"**
2. Remplir les informations :
   - **Name** : `ringarecord` (ou le nom que tu veux)
   - **Database Password** : ⚠️ **IMPORTANT** - Note ce mot de passe, tu en auras besoin !
   - **Region** : Choisis la région la plus proche (ex: `West US (N. California)`)
   - **Pricing Plan** : Free tier (gratuit pour commencer)
3. Cliquer sur **"Create new project"**
4. ⏳ Attendre 2-3 minutes que le projet soit créé

## 📋 Étape 3 : Récupérer les credentials (API Keys)

Une fois le projet créé :

1. **Dans le dashboard Supabase**, aller dans **Settings** (icône ⚙️ en bas à gauche)
2. Cliquer sur **"API"** dans le menu Settings
3. Tu verras plusieurs sections importantes :

### 🔑 Project URL
```
Project URL: https://xxxxx.supabase.co
```
**Où le trouver :** Section "Project URL" en haut de la page API Settings

### 🔑 Anon/Public Key (pour le frontend)
```
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk...
```
**Où le trouver :** Section "Project API keys" → **"anon"** ou **"public"**
**⚠️ Utilisation :** Frontend (React) - peut être exposé publiquement

### 🔑 Service Role Key (pour le backend - SECRET)
```
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4OT...
```
**Où le trouver :** Section "Project API keys" → **"service_role"**
**⚠️ SECRET :** Ne JAMAIS exposer cette clé au frontend ! Uniquement backend.

### 🔑 Database Password
C'est le mot de passe que tu as défini lors de la création du projet.
**Où le trouver :** Tu l'as noté à l'étape 2, sinon :
- Settings → Database → Reset database password (pour en créer un nouveau)

## 📋 Étape 4 : Récupérer la connection string (optionnel)

1. Aller dans **Settings** → **Database**
2. Section **"Connection string"**
3. Tu verras :
   ```
   Connection string: postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
   Remplace `[YOUR-PASSWORD]` par ton mot de passe de base de données.

## 📋 Étape 5 : Créer les tables (SQL Editor)

1. Dans le dashboard Supabase, cliquer sur **"SQL Editor"** (icône </> à gauche)
2. Cliquer sur **"New query"**
3. Copier-coller le contenu de `supabase/migrations/001_create_ringtones_table.sql`
4. Cliquer sur **"Run"** (ou Ctrl+Enter)
5. Vérifier que la table est créée : aller dans **Table Editor** → tu devrais voir `ringtones`

## 📋 Étape 6 : Configurer Storage

1. Dans le dashboard, cliquer sur **"Storage"** (icône 📦 à gauche)
2. Cliquer sur **"Create a new bucket"**
3. Remplir :
   - **Name** : `ringtones`
   - **Public bucket** : ✅ **Cocher** (pour permettre le téléchargement)
   - **File size limit** : `10` MB
   - **Allowed MIME types** : `audio/*`
4. Cliquer sur **"Create bucket"**
5. Aller dans **SQL Editor** et exécuter `supabase/migrations/002_create_storage_bucket.sql`

## 📋 Étape 7 : Créer le fichier `.env` frontend

Le backend auto-hébergé a été retiré.  
Il suffit d'ajouter un `.env` (non versionné) à la racine du projet Vite :
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
> Conserve la `service_role key` côté Supabase (ou dans un coffre-fort) et n'envoyez jamais cette clé au frontend.

## 📸 Où trouver chaque information (visuel)

```
Dashboard Supabase
│
├── ⚙️ Settings
│   ├── API
│   │   ├── Project URL          ← SUPABASE_URL
│   │   └── Project API keys
│   │       ├── anon/public      ← SUPABASE_ANON_KEY (frontend)
│   │       └── service_role     ← SUPABASE_SERVICE_ROLE_KEY (backend)
│   │
│   └── Database
│       └── Connection string    ← Pour connexion directe (optionnel)
│
├── </> SQL Editor               ← Pour exécuter les migrations
│
└── 📦 Storage                    ← Pour créer le bucket 'ringtones'
```

## ✅ Checklist avant de continuer

- [ ] Projet Supabase créé
- [ ] Project URL noté
- [ ] Anon Key noté (pour frontend)
- [ ] Service Role Key noté (stockée dans un coffre-fort, jamais côté frontend)
- [ ] Table `ringtones` créée (SQL Editor)
- [ ] Bucket `ringtones` créé dans Storage
- [ ] Policies Storage configurées (SQL Editor)
- [ ] Fichier `.env` frontend créé avec les credentials publics

## 🔒 Sécurité

- ✅ **Anon Key** : Peut être exposée publiquement (frontend)
- ❌ **Service Role Key** : JAMAIS dans le frontend ! Uniquement backend
- ❌ **Database Password** : Garde-le secret

## 📝 Template pour noter tes credentials

```markdown
# Mes credentials Supabase

## Project Info
- Project Name: ringarecord
- Project URL: https://xxxxx.supabase.co
- Region: West US

## API Keys
- Anon Key: eyJhbGc...
- Service Role Key: eyJhbGc...

## Database
- Password: ********
- Connection: postgresql://postgres:****@db.xxxxx.supabase.co:5432/postgres

## Storage
- Bucket: ringtones
- Public: ✅
- Max size: 10MB
```

Une fois que tu as toutes ces informations, dis-moi et je pourrai continuer la migration du code ! 🚀

