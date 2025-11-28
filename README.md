# RingaRecord (Supabase Edition)

Application mobile-first (React + Vite + TypeScript) pour enregistrer, gérer et télécharger des sonneries.  
Le backend auto-hébergé a été supprimé : l'app consomme directement **Supabase (Auth + Postgres + Storage)**.

## ⚙️ Prérequis

- Node.js 22+
- Compte Supabase (projet + bucket Storage configurés)
- Clés Supabase :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Consulte `SUPABASE_SETUP_GUIDE.md` et `supabase/README.md` pour la création du projet et l'exécution des migrations SQL.

## 🚀 Démarrage

```bash
npm install

# Ajouter un fichier .env à la racine
echo "VITE_SUPABASE_URL=https://XXXX.supabase.co" >> .env
echo "VITE_SUPABASE_ANON_KEY=ey..." >> .env

npm run dev
```

## 📁 Structure

```
src/
├── components/           # UI + audio player
├── hooks/                # useAudioRecorder, etc.
├── services/
│   └── supabase/         # client + auth + ringtones services
├── stores/               # Zustand stores (auth, ringtones)
├── pages/                # Login / Register / Dashboard / Record
└── types/                # Types partagés

supabase/
├── migrations/           # SQL à exécuter dans Supabase
└── README.md             # Rappels de configuration
```

## 🧪 Scripts

| Commande        | Description                       |
|-----------------|-----------------------------------|
| `npm run dev`   | Démarre Vite avec HMR             |
| `npm run build` | Compile TypeScript + bundle Vite  |
| `npm run preview` | Prévisualise le build           |
| `npm run lint`  | ESLint (config strict TypeScript) |

## 🔐 Sécurité

- **Anon key** uniquement côté frontend.
- La **service role key** reste dans Supabase / coffre-fort (pas dans le dépôt).
- RLS activé sur la table `ringtones`.
- Bucket Storage `ringtones` en lecture publique, upload contrôlé par les policies.

## 📱 Distribution mobile

Consulte `GOOGLE_PLAY_SETUP.md` pour la configuration TWA / PWA et la publication sur le Play Store.

## 🤝 Contribution

1. `git clone`
2. `npm install`
3. Créer un `.env` avec les clés Supabase
4. Respecter les règles des `.cursorrules` (TypeScript strict, tests, mobile-first)

Bonne création de sonneries ! 🎵
