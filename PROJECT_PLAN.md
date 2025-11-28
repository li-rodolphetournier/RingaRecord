# Plan de Projet - RingaRecord (Sonnerie Scan)

## 🎯 Objectif
Application mobile-first et desktop pour créer des sonneries de téléphone en enregistrant des sons via le microphone.

## 📋 Stack Technologique

### Frontend
- **Framework**: React 18+ avec TypeScript
- **Build Tool**: Vite (optimisé pour PWA et développement rapide)
- **Styling**: Tailwind CSS
- **State Management**: Zustand ou React Context API
- **Routing**: React Router v6

### Audio & Media
- **Enregistrement**: MediaRecorder API (natif navigateur)
- **Traitement Audio**: Web Audio API
- **Conversion Format**: 
  - `lamejs` pour conversion MP3
  - `ffmpeg.wasm` pour conversion avancée (m4r iOS, ogg Android)
- **Lecture Audio**: HTML5 Audio API

### Stockage & Offline
- **Stockage Local**: IndexedDB (via `idb` ou `Dexie.js`)
- **PWA**: Service Worker avec Workbox
- **Cache**: Cache API pour assets statiques
- **Métadonnées**: LocalStorage pour préférences utilisateur

### Utilitaires
- **Formatters**: date-fns
- **Validation**: Zod
- **Tests**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

## 🏗️ Architecture

```
src/
├── components/          # Composants réutilisables
│   ├── audio/
│   │   ├── AudioRecorder.tsx
│   │   ├── AudioPlayer.tsx
│   │   └── WaveformVisualizer.tsx
│   ├── ringtone/
│   │   ├── RingtoneList.tsx
│   │   ├── RingtoneCard.tsx
│   │   └── RingtoneEditor.tsx
│   └── ui/             # Composants UI de base
├── hooks/              # Custom React hooks
│   ├── useAudioRecorder.ts
│   ├── useMediaPermissions.ts
│   ├── useIndexedDB.ts
│   └── usePWA.ts
├── services/           # Services métier
│   ├── audio/
│   │   ├── recorder.service.ts
│   │   ├── converter.service.ts
│   │   └── player.service.ts
│   ├── storage/
│   │   ├── indexedDB.service.ts
│   │   └── cache.service.ts
│   └── ringtone/
│       └── ringtone.service.ts
├── utils/              # Utilitaires
│   ├── audio.utils.ts
│   ├── format.utils.ts
│   └── download.utils.ts
├── stores/             # State management (Zustand)
│   ├── audioStore.ts
│   └── ringtoneStore.ts
├── types/              # TypeScript types
│   ├── audio.types.ts
│   └── ringtone.types.ts
└── App.tsx
```

## 🚀 Phases de Développement

### Phase 1: Setup & Infrastructure (Semaine 1)
- [ ] Initialiser projet Vite + React + TypeScript
- [ ] Configurer Tailwind CSS
- [ ] Setup ESLint + Prettier
- [ ] Configurer Vitest
- [ ] Setup PWA (manifest.json, service worker)
- [ ] Configuration IndexedDB

### Phase 2: Enregistrement Audio (Semaine 2)
- [ ] Implémenter MediaRecorder API
- [ ] Gestion permissions microphone
- [ ] Interface enregistrement (start/stop/pause)
- [ ] Visualisation waveform en temps réel
- [ ] Tests enregistrement sur mobile/desktop

### Phase 3: Traitement & Conversion (Semaine 3)
- [ ] Service conversion audio (MP3, OGG, M4R)
- [ ] Édition basique (trim, fade in/out)
- [ ] Normalisation audio
- [ ] Validation format sonnerie (durée max 30-40s)
- [ ] Tests conversion formats

### Phase 4: Stockage & Gestion (Semaine 4)
- [ ] Service IndexedDB pour stockage local
- [ ] CRUD sonneries (create, read, update, delete)
- [ ] Liste des sonneries avec métadonnées
- [ ] Prévisualisation audio
- [ ] Gestion cache PWA

### Phase 5: Téléchargement & Installation (Semaine 5)
- [ ] Téléchargement fichier sonnerie
- [ ] Instructions installation iOS (via iTunes/GarageBand)
- [ ] Instructions installation Android (via fichiers)
- [ ] Partage sonnerie (Web Share API)
- [ ] Export multiple formats

### Phase 6: UX & Optimisations (Semaine 6)
- [ ] Design mobile-first responsive
- [ ] Animations et transitions
- [ ] Gestion erreurs et feedback utilisateur
- [ ] Optimisation performance (lazy loading, code splitting)
- [ ] Tests E2E (Playwright)

### Phase 7: PWA & Offline (Semaine 7)
- [ ] Service Worker complet
- [ ] Cache stratégies (assets, audio)
- [ ] Mode offline fonctionnel
- [ ] Installation PWA (prompt)
- [ ] Tests offline

### Phase 8: Polish & Déploiement (Semaine 8)
- [ ] Tests cross-browser
- [ ] Tests cross-device (iOS Safari, Chrome Android)
- [ ] Optimisation bundle size
- [ ] SEO et métadonnées
- [ ] Déploiement (Vercel/Netlify)

## 📱 Formats Sonnerie

### iOS
- **Format**: M4R (AAC dans conteneur M4A)
- **Durée max**: 30 secondes recommandé
- **Installation**: Via iTunes ou GarageBand (pas automatique depuis app)

### Android
- **Format**: MP3, OGG, ou M4A
- **Durée max**: 40 secondes recommandé
- **Installation**: Téléchargement direct, puis sélection dans paramètres

### Desktop/Web
- **Format**: MP3, OGG, WAV
- **Usage**: Téléchargement pour transfert vers mobile

## 🔒 Permissions Requises

### Web
- Microphone (MediaDevices.getUserMedia)
- Storage (IndexedDB, LocalStorage)

### Mobile (PWA)
- Microphone
- Storage
- Installation (Add to Home Screen)

## 🧪 Tests

### Unitaires
- Services audio (recorder, converter, player)
- Services storage
- Utilitaires

### Intégration
- Flux complet enregistrement → conversion → stockage
- PWA offline mode

### E2E
- Enregistrement sur mobile
- Conversion et téléchargement
- Installation sonnerie

## 📦 Dépendances Principales

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7",
    "idb": "^8.0.0",
    "lamejs": "^1.2.1",
    "ffmpeg.wasm": "^0.12.6",
    "date-fns": "^2.30.0",
    "zod": "^3.22.4",
    "workbox-window": "^7.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "vite-plugin-pwa": "^0.17.4",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.3.6",
    "vitest": "^1.0.4",
    "@testing-library/react": "^14.1.2",
    "playwright": "^1.40.1"
  }
}
```

## 🎨 Design Guidelines

### Mobile-First
- Touch-friendly (min 44x44px pour boutons)
- Navigation bottom bar sur mobile
- Swipe gestures pour actions rapides

### Desktop
- Sidebar navigation
- Drag & drop pour fichiers
- Raccourcis clavier

### Thème
- Mode sombre/clair
- Couleurs accessibles (WCAG AA)
- Animations subtiles

## 📝 Notes Techniques

### Limitations Navigateurs
- **Safari iOS**: Restrictions sur MediaRecorder, nécessite fallback
- **Chrome Android**: Support complet MediaRecorder
- **Desktop**: Support variable selon navigateur

### Performance
- Lazy loading composants lourds (ffmpeg.wasm)
- Web Workers pour traitement audio
- Compression IndexedDB pour économiser espace

### Sécurité
- Validation formats audio
- Sanitization noms fichiers
- HTTPS requis pour MediaRecorder (production)

