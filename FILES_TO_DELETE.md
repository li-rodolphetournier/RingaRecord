# Fichiers à Supprimer lors de la Migration Supabase

## ❌ À SUPPRIMER COMPLÈTEMENT

### Backend - Prisma & PostgreSQL
```
server/prisma/                    # Tout le dossier
server/prisma.config.ts
server/docker-compose.yml
server/api/src/prisma/            # Tout le module Prisma
server/api/prisma/                # Schema Prisma local
```

### Backend - Code inutile après migration
```
server/api/src/auth/jwt.strategy.ts        # Supabase gère l'auth
server/api/src/auth/jwt-auth.guard.ts      # Remplacé par Supabase RLS
server/api/src/config/config.module.ts     # Simplifier (garder pour env vars)
```

### Frontend - Services API REST
```
src/services/api/                 # Tout le dossier (remplacé par Supabase)
  ├── client.ts
  ├── auth.service.ts
  └── ringtones.service.ts
```

## ⚠️ À MODIFIER (pas supprimer)

### Backend
```
server/api/src/auth/
  ├── auth.service.ts            # Utiliser Supabase Auth
  ├── auth.controller.ts         # Simplifier (Supabase gère)
  └── auth.module.ts             # Adapter

server/api/src/ringtones/
  ├── ringtones.service.ts      # Utiliser Supabase Client
  └── ringtones.controller.ts   # Simplifier

server/api/src/upload/
  └── upload.service.ts         # Utiliser Supabase Storage

server/api/package.json         # Retirer Prisma, ajouter Supabase
```

### Frontend
```
src/stores/
  ├── authStore.ts              # Utiliser Supabase Auth
  └── ringtoneStore.ts          # Utiliser Supabase Client

package.json                    # Ajouter @supabase/supabase-js
```

## ✅ À CRÉER

### Backend
```
server/api/src/supabase/
  ├── supabase.service.ts
  └── supabase.module.ts
```

### Frontend
```
src/services/supabase/
  ├── client.ts
  └── types.ts
```

