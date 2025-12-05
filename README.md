# RingaRecord (Supabase Edition)

Application mobile-first (React + Vite + TypeScript) pour enregistrer, gérer et télécharger des sonneries.  
Le backend auto-hébergé a été supprimé : l'app consomme directement **Supabase (Auth + Postgres + Storage)**.

## 📱 Résumé de l'Application

RingaRecord est une application web progressive (PWA) permettant de créer, optimiser et gérer des sonneries personnalisées. L'application offre des fonctionnalités avancées d'édition audio incluant :

- **Enregistrement audio** : Microphone ou son système (selon le navigateur)
  - **Capture audio système améliorée** : Support pour applications externes (Teams, Discord, etc.)
  - **Détection intelligente** : Suggestions automatiques pour utiliser la version navigateur des applications
  - **Messages d'aide contextuels** : Instructions détaillées pour activer le partage audio
- **Optimisation intelligente** : Trim automatique des silences, normalisation, fade in/out
- **Découpe manuelle** : Contrôle précis du début et de la fin
- **Découpe automatique** : Détection de segments par silences (multi-parties)
- **Égaliseur audio** : 4 presets avec analyse spectrale automatique
- **Détection BPM** : Analyse automatique du tempo (60-200 BPM)
- **Synchronisation rythmique** : Création de boucles parfaites
- **Gestion de favoris** : Organisation en dossiers personnalisés
- **Protection** : Étoile pour protéger les sonneries contre la suppression

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
│   ├── audio/                  # AudioPlayer, Equalizer
│   └── ui/                     # Button, Card, Input
├── hooks/                      # useAudioRecorder, useSmartRingtone, useSegmentPreview, useEqualizer, useBPMDetection
├── services/
│   ├── audio/                  # smartRingtone, equalizer, bpmDetection, spectralAnalysis, ringtoneSegments
│   └── supabase/               # client + auth + ringtones services
├── stores/                     # Zustand stores (auth, ringtones)
├── pages/                      # Login / Register / Dashboard / Record
├── types/                      # Types partagés (ringtone, equalizer, bpm)
├── utils/                      # Utilitaires (ringtoneConstants, ringtoneFile.utils)
└── test/                       # Setup Vitest

supabase/
├── migrations/           # SQL à exécuter dans Supabase
│   ├── 001_create_ringtones_table.sql    # Table ringtones (durée max: 120s)
│   ├── 002_create_storage_bucket.sql
│   ├── 003_add_is_protected_column.sql  # Migration pour protection (is_protected)
│   └── 004_update_duration_constraint.sql # Mise à jour contrainte durée (40s → 120s)
└── README.md             # Rappels de configuration
```

## 🎧 Assistant Smart Ringtone – Fonctionnalités

### Sur la page **Record** (création d'une nouvelle sonnerie)

- **Optimisation intelligente**
  - Trim automatique des silences début/fin.
  - Normalisation du volume + fade-in / fade-out.
  - **Durée maximum configurable** : Curseur pour ajuster la durée max (5-120s, défaut: 120s).
    - Permet d'enregistrer des sonneries plus longues (jusqu'à 120 secondes)
    - Validation automatique côté client et serveur
    - Indicateurs visuels : Courte (≤20s), Standard (≤40s), Longue (≤60s), Très longue (≤120s)

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
      - **bouton Play/Pause** : Cliquez pour lire le segment, cliquez à nouveau pour mettre en pause
      - **Icône visuelle** : Play (▶) quand en pause, Pause (⏸) quand en lecture
      - Lecture automatique limitée au segment (s'arrête à la fin du segment)
  - Sauvegarde :
    - 1 segment coché → **1 sonnerie**.
    - plusieurs segments cochés → **une sonnerie par segment sélectionné**.

- **🎚️ Égaliseur Audio avec Presets Intelligents** *(Nouveau)*
  - **Analyse spectrale automatique** : bouton "🔍 Analyser" pour analyser le spectre audio et suggérer le meilleur preset.
  - **4 presets prédéfinis** :
    - **Bass Boost** : Renforce les basses pour plus de profondeur
    - **Vocal Clarity** : Améliore la clarté des voix et paroles
    - **Bright** : Éclaire les aigus pour plus de brillance
    - **Warm** : Ajoute de la chaleur avec des médiums renforcés
  - **Visualisation graphique** : courbe de réponse fréquentielle en temps réel (Canvas).
  - **Application en un clic** : bouton "✨ Appliquer l'égalisation" pour traiter l'audio.
  - Utilise Web Audio API `BiquadFilterNode` pour un traitement professionnel.

- **🎵 Détection Automatique de BPM** *(Nouveau - Expérimental)*
  - Bouton **"🎵 Détecter le BPM"** pour analyser le tempo de l'enregistrement.
  - Détection automatique du BPM (60-200 BPM) avec score de confiance.
  - Affichage du BPM détecté, de la méthode utilisée (autocorrélation) et du niveau de confiance.
  - Utilise l'**autocorrélation** pour détecter la périodicité dans le signal audio.
  - Préparation pour la **synchronisation rythmique** et création de boucles parfaites (voir `PLAN_RHYTHM_SYNC.md`).

### Sur la page **Dashboard** (sonneries existantes)

Pour chaque carte de sonnerie :

- **⭐ Protection contre la suppression** *(Nouveau)*
  - Étoile cliquable à côté du titre pour activer/désactiver la protection.
  - Étoile **jaune** = sonnerie protégée, **grise** = non protégée.
  - Les sonneries protégées ne peuvent pas être supprimées (bouton "Supprimer" désactivé).
  - Message d'avertissement si tentative de suppression d'une sonnerie protégée.

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

- **🎚️ Égaliseur Audio pour sonneries existantes** *(Nouveau)*
  - Section **"Égaliseur Audio"** dans le panneau de découpe/optimisation.
  - Bouton **"Ouvrir"** pour activer l'égaliseur sur une sonnerie existante.
  - Analyse spectrale automatique au clic sur "Ouvrir".
  - Même interface que pour les nouvelles sonneries (presets, visualisation, application).
  - Crée une nouvelle sonnerie avec le suffixe "(égalisé)" après application.

## 🧪 Scripts et Commandes

| Commande        | Description                       |
|-----------------|-----------------------------------|
| `npm install`   | Installe les dépendances          |
| `npm run dev`   | Démarre Vite avec HMR (développement) |
| `npm run build` | Compile TypeScript + bundle Vite (production) |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint`  | ESLint (config strict TypeScript) |
| `npm run test`  | Lance les tests Vitest (mode watch) |
| `npm run test:run` | Exécute les tests une fois |
| `npm run test:ui` | Interface UI Vitest |
| `npm run build:vercel` | **Simule le build Vercel** : lint + tests + build |
| `npm run deploy:check` | Alias pour `build:vercel` |
| `npm run deploy:check:win` | Script PowerShell complet (Windows) |
| `npm run deploy:check:unix` | Script Bash complet (Linux/Mac) |

### Tests Disponibles

- ✅ `ringtoneConstants.test.ts` - Tests des constantes de durée
- ✅ `ringtoneFile.utils.test.ts` - Tests des utilitaires de fichiers audio
- ✅ `bpmDetection.service.test.ts` - Tests de détection BPM
- ✅ `equalizer.service.test.ts` - Tests de l'égaliseur
- ✅ `spectralAnalysis.service.test.ts` - Tests d'analyse spectrale

## 🔐 Sécurité

- **Anon key** uniquement côté frontend.
- La **service role key** reste dans Supabase / coffre-fort (pas dans le dépôt).
- RLS activé sur la table `ringtones`.
- Bucket Storage `ringtones` en lecture publique, upload contrôlé par les policies.
- **Protection des sonneries** : colonne `is_protected` pour empêcher la suppression accidentelle.

## 🆕 Nouvelles Fonctionnalités

### Version actuelle

- ✅ **⏱️ Durée Maximum Configurable (5-120s)**
  - **Curseur de durée** : Ajustez la durée maximum d'enregistrement (5-120 secondes)
  - **Validation centralisée** : Constantes partagées (`ringtoneConstants.ts`) pour cohérence
  - **Migration base de données** : Contrainte CHECK mise à jour (40s → 120s)
  - **Indicateurs visuels** : Labels contextuels (Courte, Standard, Longue, Très longue)
  - **Validation côté client et serveur** : Messages d'erreur clairs si limite dépassée

- ✅ **🎵 Lecture de Segments avec Pause/Play**
  - **Contrôle de lecture** : Cliquez sur un segment pour le lire, cliquez à nouveau pour mettre en pause
  - **Indicateur visuel** : Icône play/pause selon l'état de lecture
  - **Lecture automatique limitée** : S'arrête automatiquement à la fin du segment
  - **Gestion d'état** : Suivi de l'état de lecture pour chaque segment

- ✅ **🎤 Capture Audio Système Améliorée**
  - **Support applications externes** : Détection automatique des applications desktop (Teams, Discord)
  - **Suggestions intelligentes** : Recommandation d'utiliser la version navigateur si nécessaire
  - **Messages d'aide contextuels** : Instructions détaillées pour activer "Partager l'audio"
  - **Détection d'interruption** : Arrêt automatique si l'utilisateur arrête le partage
  - **Gestion d'erreurs robuste** : Messages clairs avec solutions étape par étape

- ✅ **🎨 Amélioration des Toasts d'Erreur**
  - **Responsive** : S'adapte à la taille de la fenêtre (max 90vw, 80vh)
  - **Scrollbar personnalisée** : Pour les messages longs avec défilement vertical
  - **Préservation du formatage** : `white-space: pre-wrap` pour conserver les retours à la ligne
  - **CSS moderne** : Utilisation de CSS Cascade Layers (pas de `!important`)
  - **Mobile-friendly** : Styles optimisés pour petits écrans

- ✅ **🎚️ Égaliseur Audio avec Presets Intelligents**
  - 4 presets prédéfinis : **Bass Boost**, **Vocal Clarity**, **Bright**, **Warm**
  - **Analyse spectrale automatique** : bouton "🔍 Analyser" pour suggérer le meilleur preset
  - **Visualisation graphique** : courbe de réponse fréquentielle en temps réel (Canvas)
  - **Application en un clic** : traitement audio professionnel avec Web Audio API `BiquadFilterNode`
  - Disponible sur **nouvelles sonneries** (page Record) et **sonneries existantes** (Dashboard)
  - Crée une nouvelle version avec suffixe "(égalisé)" après application

- ✅ **🎵 Détection Automatique de BPM** (Expérimental)
  - Détection du tempo (60-200 BPM) via **autocorrélation**
  - Affichage du BPM détecté avec **score de confiance** (0-100%)
  - Méthode utilisée : autocorrélation pour détecter la périodicité
  - Disponible sur la page **Record** pour nouvelles sonneries
  - Préparation pour **synchronisation rythmique** et création de boucles parfaites (à venir)

- ✅ **⭐ Mode Protection avec Étoile**
  - **Étoile cliquable** à côté du titre pour activer/désactiver la protection
  - **Étoile jaune** = sonnerie protégée, **grise** = non protégée
  - **Blocage de suppression** : les sonneries protégées ne peuvent pas être supprimées
  - Message d'avertissement si tentative de suppression d'une sonnerie protégée
  - Colonne `is_protected` dans la base de données (migration `003_add_is_protected_column.sql`)

### En développement

- 🔄 **Synchronisation Rythmique et Création de Boucles Parfaites**
  - Détection automatique de points de boucle optimaux basés sur la phase audio
  - Création de sonneries qui bouclent sans coupure audible
  - Alignement sur grille rythmique (beats)
  - Application de crossfade pour transition fluide
  - Options : 1, 2, 4, 8 mesures par boucle
  - Voir `PLAN_RHYTHM_SYNC.md` pour le plan détaillé

### À venir

- 🎨 Visualiseur de waveform interactif avec édition directe
- 📊 Statistiques d'utilisation et analytics audio
- 🌐 Partage social et galerie communautaire

## 📱 Distribution mobile

Consulte `GOOGLE_PLAY_SETUP.md` pour la configuration TWA / PWA et la publication sur le Play Store.

## 📚 Documentation Technique

- **`PLAN_BPM_DETECTION.md`** : Plan détaillé pour la détection de BPM
- **`PLAN_RHYTHM_SYNC.md`** : Plan détaillé pour la synchronisation rythmique et création de boucles
- **`FEATURES_PROPOSALS.md`** : 10 fonctionnalités proposées avec notation pertinence/difficulté

## 🤝 Contribution

1. `git clone`
2. `npm install`
3. Créer un `.env` avec les clés Supabase
4. Exécuter les migrations SQL dans Supabase (voir `supabase/migrations/`)
5. Respecter les règles des `.cursorrules` (TypeScript strict, tests, mobile-first)
6. Lancer les tests : `npm run test`

## 🔄 Refactorings Réalisés

### ✅ Architecture et Structure

**Toutes les refactorisations majeures sont terminées !** Le codebase suit maintenant les meilleures pratiques React :

#### Centralisation des Constantes
- ✅ **`ringtoneConstants.ts`** : Constantes centralisées pour durée min/max
  - `MAX_RINGTONE_DURATION_SECONDS = 120`
  - `MIN_RINGTONE_DURATION_SECONDS = 1`
  - Utilisées dans : `ringtones.service.ts`, `ringtoneFile.utils.ts`, `smartRingtone.service.ts`
  - **Avantage** : Modification en un seul endroit, cohérence garantie

#### Pages et Composants Principaux
- ✅ **Dashboard.tsx** → `useDashboard` (536 → 312 lignes, **-42%**)
- ✅ **RingtoneDetailsModal.tsx** → `useRingtoneDetailsModal` (953 → 661 lignes, **-31%**)
- ✅ **Favorites.tsx** → `useFavorites` (267 → 123 lignes, **-54%**)
- ✅ **AudioPlayer.tsx** → `useAudioPlayer` (172 → 102 lignes, **-41%**)
- ✅ **Equalizer.tsx** → `useEqualizerCanvas` (281 → 210 lignes, **-25%**)
- ✅ **ShareModal.tsx** → `useShareModal` (226 → 171 lignes, **-24%**)
- ✅ **RingtoneCard.tsx** → Props groupées (304 → 277 lignes, **-9%**)

#### Hooks et Utilitaires Créés
- ✅ `useDashboard` - Logique métier du Dashboard
- ✅ `useRingtoneDetailsModal` - Logique métier du modal
- ✅ `useFavorites` - Logique métier de la page Favorites
- ✅ `useAudioPlayer` - Logique de lecture audio
- ✅ `useEqualizerCanvas` - Logique de dessin canvas
- ✅ `useShareModal` - Logique de partage
- ✅ `useRecordPage` - Gestion d'erreurs centralisée
- ✅ `useErrorHandler` - Gestion centralisée des erreurs (composants)
- ✅ `errorUtils` - Gestion d'erreurs pour stores Zustand
- ✅ `useRingtoneOperations` - Opérations partagées sur les sonneries
- ✅ `ringtoneFile.utils` - Utilitaires pour fichiers audio

#### Améliorations Apportées
- ✅ **Séparation logique/présentation** : Composants ne font que le rendu, logique dans les hooks
- ✅ **Gestion d'erreurs centralisée** : `useErrorHandler` et `errorUtils` pour cohérence
- ✅ **Élimination de la duplication** : ~400 lignes de code dupliqué supprimées
- ✅ **Code maintenable** : Architecture solide et testable
- ✅ **TypeScript strict** : Aucun `any`, types explicites partout
- ✅ **Constantes centralisées** : Durée min/max dans un seul fichier, utilisées partout
- ✅ **CSS moderne** : Cascade Layers pour éviter `!important`, styles responsive
- ✅ **Tests unitaires** : Tests pour constantes et utilitaires

### 📊 Impact Global

- **Réduction totale** : ~760 lignes dans les composants
- **Hooks créés** : 11 hooks et utilitaires réutilisables
- **Code dupliqué** : ~400 lignes éliminées
- **Toast directs** : 48 occurrences remplacées par gestion centralisée

### 📚 Documentation des Refactorings

Pour plus de détails, consultez :
- `docs/REFACTORING_COMPLETE_SUMMARY.md` - Résumé complet des refactorings
- `docs/REMAINING_REFACTORING.md` - État actuel (toutes les refactorisations prioritaires terminées)

## 🚧 Refactorings Restants

### ✅ Toutes les refactorisations prioritaires sont terminées !

Le codebase est maintenant dans un excellent état :
- ✅ Tous les composants principaux ont été refactorisés
- ✅ Toute la logique métier est extraite dans des hooks réutilisables
- ✅ Gestion d'erreurs centralisée et cohérente
- ✅ Code propre, maintenable et testable
- ✅ Architecture solide pour les futures fonctionnalités

### 🔲 Optimisations Futures (Optionnelles)

Si besoin dans le futur :
- Tests unitaires pour les nouveaux hooks
- Documentation supplémentaire des patterns utilisés
- Optimisations de performance si nécessaire

---

Bonne création de sonneries ! 🎵
