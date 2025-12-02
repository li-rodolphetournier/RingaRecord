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
├── components/                 # UI + audio player
├── hooks/                      # useAudioRecorder, useSmartRingtone, useSegmentPreview
├── services/
│   ├── audio/                  # smartRingtone + découpe multi-segments
│   └── supabase/               # client + auth + ringtones services
├── stores/                     # Zustand stores (auth, ringtones)
├── pages/                      # Login / Register / Dashboard / Record
└── types/                      # Types partagés

supabase/
├── migrations/           # SQL à exécuter dans Supabase
└── README.md             # Rappels de configuration
```

## 🎧 Assistant Smart Ringtone – Fonctionnalités

### Sur la page **Record** (création d'une nouvelle sonnerie)

- **Optimisation intelligente**
  - Trim automatique des silences début/fin.
  - Normalisation du volume + fade-in / fade-out.
  - Limitation automatique à ~40s.

- **Découpe manuelle (début / fin)**
  - Case à cocher "Activer la découpe manuelle".
  - 2 sliders pour choisir précisément le début et la fin.
  - La sonnerie générée utilise uniquement cette plage.

- **Découpe automatique par silences (multi-parties)**
  - Deux sliders de réglage :
    - **Seuil de volume (dB)** : détermine à partir de quel niveau un passage est considéré comme silencieux.
    - **Durée minimale du blanc (ms)** : longueur minimale d'un silence pour être considéré comme une coupure.
  - Détection des segments entre les blancs :
    - Visualisation sous forme de **timeline colorée** (une couleur par segment, numéroté).
    - Liste de segments avec :
      - **case à cocher** pour sélectionner les parties à garder,
      - indication du temps (`00:05 → 00:12`),
      - bouton **"Écouter"** qui lit uniquement ce segment dans le player de prévisualisation.
  - Sauvegarde :
    - 1 segment coché → **1 sonnerie**.
    - plusieurs segments cochés → **une sonnerie par segment sélectionné**.

### Sur la page **Dashboard** (sonneries existantes)

Pour chaque carte de sonnerie :

- **Renommage direct**
  - Bouton **"Renommer"** à côté du titre.
  - Champ texte inline + boutons **Enregistrer / Annuler**.
  - Mise à jour via Supabase (`updateRingtone`).

- **Découpe manuelle existante**
  - Bouton **"✂️ Découper / optimiser"** :
    - affiche un panneau avec sliders **Début** / **Fin** en secondes.
    - bouton **"✨ Créer une version optimisée découpée"** : crée une nouvelle sonnerie optimisée limitée à cette plage.

- **Assistant Smart Ringtone (multi-parties) pour les fichiers déjà uploadés**
  - Toujours dans le même panneau, sous la découpe manuelle :
    - Bouton **"Analyser"** :
      - télécharge le fichier de la sonnerie,
      - détecte les blancs internes,
      - remplit les segments pour cette sonnerie.
    - Deux sliders globaux (partagés entre les cartes, mais l'analyse est propre à la sonnerie sélectionnée) :
      - **Seuil de volume (dB)**,
      - **Durée minimale du blanc (ms)**.
    - Si des segments sont trouvés :
      - timeline colorée,
      - liste de segments avec cases à cocher + bouton **"Écouter"** pour chaque partie,
      - player audio pour pré-écouter le fichier de base avec la position limitée au segment actif.
    - Bouton **"Créer une sonnerie par partie sélectionnée"** :
      - pour chaque segment coché :
        - génère un nouveau Blob via le service audio (`buildRingtonesForSegments`),
        - crée une nouvelle entrée Supabase (titre `Titre (partie X)`).

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
