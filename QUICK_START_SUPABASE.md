# 🚀 Guide Rapide : Récupérer les Infos Supabase

## ⚡ En 5 minutes

### 1️⃣ Créer le projet
1. Va sur **https://supabase.com**
2. Clique **"Start your project"** → Connecte-toi
3. Clique **"New Project"**
4. Remplis :
   - Name : `ringarecord`
   - Password : ⚠️ **NOTE-LE** (ex: `MonMotDePasse123!`)
   - Region : Choisis la plus proche
5. Clique **"Create new project"**
6. ⏳ Attends 2-3 minutes

### 2️⃣ Récupérer les clés API
Une fois le projet créé :

1. Clique sur **⚙️ Settings** (en bas à gauche)
2. Clique sur **"API"**
3. Tu verras 3 choses importantes :

#### 📍 Project URL
```
https://xxxxx.supabase.co
```
→ Copie cette URL

#### 🔑 anon key (pour le frontend)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
→ Copie cette clé (section "Project API keys" → `anon`)

#### 🔐 service_role key (pour le backend - SECRET)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
→ Copie cette clé (section "Project API keys" → `service_role`)
⚠️ **NE JAMAIS** la mettre dans le frontend !

### 3️⃣ Créer la table
1. Clique sur **</> SQL Editor** (à gauche)
2. Clique **"New query"**
3. Ouvre le fichier `supabase/migrations/001_create_ringtones_table.sql`
4. Copie tout le contenu
5. Colle dans l'éditeur SQL
6. Clique **"Run"** (ou Ctrl+Enter)
7. ✅ Tu devrais voir "Success"

### 4️⃣ Créer le Storage
1. Clique sur **📦 Storage** (à gauche)
2. Clique **"Create a new bucket"**
3. Remplis :
   - Name : `ringtones`
   - ✅ Cocher **"Public bucket"**
   - File size limit : `10` MB
   - Allowed MIME types : `audio/*`
4. Clique **"Create bucket"**
5. Retourne dans **</> SQL Editor**
6. Ouvre `supabase/migrations/002_create_storage_bucket.sql`
7. Copie-colle et exécute

### 5️⃣ Créer le `.env` frontend

Le backend local a été retiré. Il suffit désormais de configurer Vite :
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
> Conserve la `service_role key` dans Supabase (ou un coffre-fort) mais ne l'ajoute pas dans le dépôt.

## ✅ Vérification

Une fois tout fait, tu devrais avoir :
- ✅ Un projet Supabase créé
- ✅ Les credentials notés (URL + anon key, service_role key stockée à part)
- ✅ La table `ringtones` créée (vérifie dans Table Editor)
- ✅ Le bucket `ringtones` créé (vérifie dans Storage)
- ✅ Le fichier `.env` frontend créé

## 🎯 Prochaine étape

Une fois que tu as toutes ces infos, dis-moi et je continuerai la migration du code ! 🚀

