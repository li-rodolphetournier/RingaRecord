# 🎵 Plan d'Implémentation : Détection BPM et Synchronisation Rythmique

## 📋 Vue d'ensemble

**Objectif :** Détecter automatiquement le BPM (beats per minute) d'un enregistrement audio et créer des boucles parfaitement synchronisées pour des sonneries qui "bouclent" naturellement sans coupure audible.

**Pertinence :** ⭐⭐⭐⭐ (4/5)  
**Difficulté :** ⭐⭐⭐⭐ (4/5)

---

## 🎯 Fonctionnalités

### 1. Détection de BPM
- Analyse automatique du tempo (60-200 BPM)
- Affichage du BPM détecté avec confiance (0-100%)
- Correction manuelle possible si détection incorrecte

### 2. Détection de Points de Boucle
- Identification automatique des points de boucle parfaits (loop points)
- Basé sur la phase audio et la structure rythmique
- Visualisation des points de boucle sur la waveform

### 3. Création de Boucles Synchronisées
- Génération de sonneries qui bouclent sans coupure
- Ajustement automatique de la durée pour correspondre à un nombre entier de mesures
- Option de créer plusieurs boucles (1, 2, 4, 8 mesures)

### 4. Visualisation Rythmique
- Affichage des beats détectés sur la timeline
- Indicateur visuel des points de boucle
- Waveform avec marqueurs de tempo

---

## 🏗️ Architecture Technique

### Stack Technologique

```
Web Audio API
├── OfflineAudioContext (traitement asynchrone)
├── AnalyserNode (FFT pour analyse spectrale)
├── ScriptProcessorNode / AudioWorklet (traitement personnalisé)
└── AudioBuffer (manipulation des échantillons)

Algorithmes
├── Onset Detection (détection d'attaques)
├── Autocorrélation (détection de périodicité)
├── Phase Alignment (alignement de phase)
└── Beat Tracking (suivi de tempo)
```

### Structure de Fichiers

```
src/
├── services/
│   └── audio/
│       ├── bpmDetection.service.ts      # Service principal de détection BPM
│       ├── loopDetection.service.ts     # Détection des points de boucle
│       ├── beatTracking.service.ts      # Suivi des beats en temps réel
│       └── rhythmSync.service.ts        # Synchronisation et création de boucles
│
├── hooks/
│   ├── useBPMDetection.ts               # Hook React pour détection BPM
│   └── useLoopSync.ts                   # Hook pour synchronisation de boucles
│
├── components/
│   ├── audio/
│   │   ├── BPMDetector.tsx              # Composant UI pour détection BPM
│   │   ├── LoopPointEditor.tsx          # Éditeur de points de boucle
│   │   └── RhythmVisualizer.tsx         # Visualisation rythmique
│   │
│   └── ui/
│       └── BPMDisplay.tsx               # Affichage du BPM avec confiance
│
├── types/
│   └── bpm.types.ts                     # Types TypeScript pour BPM/rythme
│
└── utils/
    └── audioAnalysis.utils.ts           # Utilitaires d'analyse audio
```

---

## 🔬 Algorithmes de Détection

### 1. Onset Detection (Détection d'Attaques)

**Principe :** Détecter les moments où l'énergie audio augmente brusquement (attaques de notes, percussions).

```typescript
/**
 * Détecte les onsets (attaques) dans un AudioBuffer
 * @param audioBuffer - Buffer audio à analyser
 * @param threshold - Seuil de détection (0-1)
 * @returns Array de timestamps en secondes où des onsets sont détectés
 */
function detectOnsets(
  audioBuffer: AudioBuffer,
  threshold: number = 0.3
): number[] {
  // 1. Calculer l'enveloppe d'énergie (energy envelope)
  // 2. Calculer la dérivée (rate of change)
  // 3. Détecter les pics de dérivée > threshold
  // 4. Filtrer les onsets trop proches (< 50ms)
}
```

**Implémentation :**
- Utiliser `AnalyserNode` avec FFT pour obtenir le spectre
- Calculer l'énergie par fenêtre temporelle (10-20ms)
- Détecter les pics d'énergie (dérivée positive forte)
- Filtrer les faux positifs (seuil adaptatif)

### 2. Autocorrélation (Détection de Périodicité)

**Principe :** Trouver la période dominante dans le signal en calculant l'autocorrélation.

```typescript
/**
 * Calcule l'autocorrélation pour détecter la périodicité
 * @param audioBuffer - Buffer audio
 * @param minBPM - BPM minimum à chercher (défaut: 60)
 * @param maxBPM - BPM maximum à chercher (défaut: 200)
 * @returns BPM détecté avec score de confiance
 */
function detectBPMWithAutocorrelation(
  audioBuffer: AudioBuffer,
  minBPM: number = 60,
  maxBPM: number = 200
): { bpm: number; confidence: number } {
  // 1. Convertir en signal mono
  // 2. Appliquer un filtre passe-haut (HPF) pour accentuer les percussions
  // 3. Calculer l'autocorrélation sur une fenêtre glissante
  // 4. Trouver le pic principal dans la plage BPM
  // 5. Calculer le score de confiance
}
```

**Formule d'autocorrélation :**
```
R(τ) = Σ x(t) * x(t + τ)
```

**Optimisations :**
- Utiliser FFT pour calcul rapide (O(n log n) au lieu de O(n²))
- Fenêtre glissante pour suivi de tempo variable
- Filtrage passe-haut pour accentuer les percussions

### 3. Beat Tracking (Suivi de Beats)

**Principe :** Suivre les beats individuels et ajuster dynamiquement le tempo.

```typescript
/**
 * Suit les beats individuels dans l'audio
 * @param audioBuffer - Buffer audio
 * @param initialBPM - BPM initial (optionnel)
 * @returns Array de positions de beats en secondes
 */
function trackBeats(
  audioBuffer: AudioBuffer,
  initialBPM?: number
): number[] {
  // 1. Détecter les onsets
  // 2. Si BPM initial fourni, utiliser pour prédire les beats suivants
  // 3. Sinon, détecter le BPM d'abord
  // 4. Aligner les onsets sur une grille rythmique
  // 5. Ajuster dynamiquement pour suivre les variations de tempo
}
```

### 4. Phase Alignment (Alignement de Phase)

**Principe :** Trouver les points où le signal audio peut boucler sans discontinuité.

```typescript
/**
 * Trouve les points de boucle optimaux basés sur la phase
 * @param audioBuffer - Buffer audio
 * @param bpm - BPM détecté
 * @param beatsPerLoop - Nombre de beats par boucle (4, 8, 16, etc.)
 * @returns Points de boucle optimaux (start, end) en secondes
 */
function findLoopPoints(
  audioBuffer: AudioBuffer,
  bpm: number,
  beatsPerLoop: number = 4
): { startSeconds: number; endSeconds: number; quality: number } {
  // 1. Calculer la durée d'une mesure (4 beats = 1 mesure)
  // 2. Analyser la phase audio à différentes positions
  // 3. Trouver les points où la phase est similaire
  // 4. Calculer un score de qualité de boucle (crossfade test)
  // 5. Retourner les meilleurs points avec score
}
```

**Méthode de calcul :**
- Comparer les échantillons autour des points candidats
- Calculer la corrélation croisée
- Tester un crossfade pour évaluer la qualité
- Score de qualité : 0-1 (1 = boucle parfaite)

---

## 📝 Implémentation Détaillée

### Phase 1 : Service de Détection BPM (Semaine 1)

#### Fichier : `src/services/audio/bpmDetection.service.ts`

```typescript
/**
 * Service de détection de BPM (Beats Per Minute)
 * Utilise l'autocorrélation et la détection d'onsets
 */

export interface BPMDetectionResult {
  bpm: number;
  confidence: number; // 0-1
  method: 'autocorrelation' | 'onset' | 'hybrid';
  beats?: number[]; // Positions des beats en secondes
}

export interface BPMDetectionOptions {
  minBPM?: number;
  maxBPM?: number;
  useOnsetDetection?: boolean;
  useAutocorrelation?: boolean;
}

/**
 * Détecte le BPM d'un AudioBuffer
 */
export async function detectBPM(
  audioBuffer: AudioBuffer,
  options: BPMDetectionOptions = {}
): Promise<BPMDetectionResult> {
  // Implémentation complète
}

/**
 * Détecte les onsets (attaques) dans l'audio
 */
function detectOnsets(audioBuffer: AudioBuffer, threshold: number): number[] {
  // Implémentation
}

/**
 * Calcule l'autocorrélation pour trouver la périodicité
 */
function autocorrelate(
  signal: Float32Array,
  sampleRate: number,
  minBPM: number,
  maxBPM: number
): { bpm: number; confidence: number } {
  // Implémentation avec FFT
}
```

**Tests unitaires :**
- Audio avec BPM connu (120 BPM, 140 BPM)
- Audio sans rythme clair (parole)
- Audio avec tempo variable
- Audio très court (< 2 secondes)

### Phase 2 : Détection de Points de Boucle (Semaine 2)

#### Fichier : `src/services/audio/loopDetection.service.ts`

```typescript
/**
 * Service de détection de points de boucle optimaux
 */

export interface LoopPoint {
  startSeconds: number;
  endSeconds: number;
  quality: number; // 0-1, qualité de la boucle
  beatsCount: number; // Nombre de beats dans la boucle
}

export interface LoopDetectionOptions {
  bpm: number;
  beatsPerLoop?: number; // 1, 2, 4, 8, 16 (défaut: 4)
  minLoopDuration?: number; // Durée minimale en secondes
  maxLoopDuration?: number; // Durée maximale en secondes
}

/**
 * Trouve les meilleurs points de boucle
 */
export async function findLoopPoints(
  audioBuffer: AudioBuffer,
  options: LoopDetectionOptions
): Promise<LoopPoint[]> {
  // 1. Calculer la durée d'une mesure
  // 2. Analyser la phase à différentes positions
  // 3. Tester les candidats de boucle
  // 4. Retourner les meilleurs points triés par qualité
}

/**
 * Teste la qualité d'une boucle en calculant la corrélation croisée
 */
function testLoopQuality(
  audioBuffer: AudioBuffer,
  startSeconds: number,
  endSeconds: number
): number {
  // Compare les échantillons au début et à la fin
  // Retourne un score 0-1
}
```

### Phase 3 : Service de Synchronisation (Semaine 2-3)

#### Fichier : `src/services/audio/rhythmSync.service.ts`

```typescript
/**
 * Service de synchronisation rythmique et création de boucles
 */

export interface RhythmSyncOptions {
  bpm: number;
  beatsPerLoop: number;
  loopStartSeconds?: number;
  loopEndSeconds?: number;
  crossfadeDuration?: number; // Durée du crossfade en ms
}

/**
 * Crée une sonnerie bouclée parfaitement synchronisée
 */
export async function createSyncedLoop(
  audioBuffer: AudioBuffer,
  options: RhythmSyncOptions
): Promise<Blob> {
  // 1. Découper l'audio selon les points de boucle
  // 2. Ajuster la durée pour correspondre exactement à un nombre entier de mesures
  // 3. Appliquer un crossfade pour transition fluide
  // 4. Normaliser et optimiser
  // 5. Retourner le Blob
}

/**
 * Applique un crossfade entre le début et la fin pour boucle fluide
 */
function applyCrossfade(
  audioBuffer: AudioBuffer,
  crossfadeDurationMs: number
): AudioBuffer {
  // Implémentation
}
```

### Phase 4 : Hooks React (Semaine 3)

#### Fichier : `src/hooks/useBPMDetection.ts`

```typescript
/**
 * Hook React pour détection BPM
 */

export interface UseBPMDetectionReturn {
  isDetecting: boolean;
  result: BPMDetectionResult | null;
  error: string | null;
  detectBPM: (blob: Blob) => Promise<void>;
  reset: () => void;
}

export function useBPMDetection(): UseBPMDetectionReturn {
  // État, gestion d'erreurs, appel au service
}
```

#### Fichier : `src/hooks/useLoopSync.ts`

```typescript
/**
 * Hook React pour synchronisation de boucles
 */

export interface UseLoopSyncReturn {
  isProcessing: boolean;
  loopPoints: LoopPoint[];
  selectedLoopPoint: LoopPoint | null;
  syncedBlob: Blob | null;
  error: string | null;
  detectLoops: (blob: Blob, bpm: number) => Promise<void>;
  createSyncedLoop: (beatsPerLoop: number) => Promise<void>;
  selectLoopPoint: (point: LoopPoint) => void;
}

export function useLoopSync(): UseLoopSyncReturn {
  // État, gestion de la sélection, création de boucles
}
```

### Phase 5 : Composants UI (Semaine 4)

#### Fichier : `src/components/audio/BPMDetector.tsx`

```typescript
/**
 * Composant pour détection et affichage du BPM
 */

export function BPMDetector() {
  // UI avec :
  // - Bouton "Détecter BPM"
  // - Affichage du BPM avec confiance
  // - Slider pour correction manuelle
  // - Indicateur de progression
}
```

#### Fichier : `src/components/audio/LoopPointEditor.tsx`

```typescript
/**
 * Éditeur de points de boucle avec visualisation
 */

export function LoopPointEditor() {
  // UI avec :
  // - Waveform avec marqueurs de beats
  // - Points de boucle visibles
  // - Sélection de nombre de beats (1, 2, 4, 8, 16)
  // - Prévisualisation de la boucle
  // - Bouton "Créer sonnerie bouclée"
}
```

#### Fichier : `src/components/audio/RhythmVisualizer.tsx`

```typescript
/**
 * Visualisation rythmique avec beats et timeline
 */

export function RhythmVisualizer() {
  // Canvas/SVG avec :
  // - Waveform
  // - Marqueurs de beats (lignes verticales)
  // - Zone de boucle (highlight)
  // - Indicateur de lecture
}
```

---

## 🧪 Tests

### Tests Unitaires (Vitest)

#### `src/services/audio/bpmDetection.service.test.ts`

```typescript
describe('bpmDetection.service', () => {
  it('should detect 120 BPM accurately', async () => {
    // Générer un signal audio synthétique à 120 BPM
    // Vérifier que la détection retourne ~120 BPM avec confiance > 0.8
  });

  it('should handle audio without clear rhythm', async () => {
    // Audio de parole
    // Vérifier que la confiance est faible (< 0.5)
  });

  it('should respect min/max BPM constraints', async () => {
    // Vérifier que le BPM détecté est dans la plage
  });
});
```

#### `src/services/audio/loopDetection.service.test.ts`

```typescript
describe('loopDetection.service', () => {
  it('should find loop points at measure boundaries', async () => {
    // Audio avec structure claire
    // Vérifier que les points sont aux bonnes positions
  });

  it('should calculate loop quality correctly', () => {
    // Test avec audio qui boucle parfaitement
    // Vérifier quality > 0.9
  });
});
```

### Tests d'Intégration

- Flux complet : Blob → Détection BPM → Détection boucles → Création sonnerie
- Intégration avec `smartRingtone.service.ts` existant
- Performance sur fichiers longs (> 1 minute)

---

## 🎨 Intégration avec l'Existant

### Modification de `smartRingtone.service.ts`

Ajouter une option pour la synchronisation rythmique :

```typescript
export interface SmartRingtoneOptions {
  // ... options existantes
  enableRhythmSync?: boolean;
  bpm?: number; // Si fourni, utilise ce BPM au lieu de détecter
  beatsPerLoop?: number; // Nombre de beats par boucle (défaut: 4)
}
```

### Modification de la page `Record.tsx`

Ajouter une section "Synchronisation Rythmique" :
- Case à cocher "Activer la synchronisation rythmique"
- Affichage du BPM détecté
- Sélection du nombre de beats par boucle
- Prévisualisation de la boucle

### Modification du Dashboard

Ajouter un bouton "Synchroniser rythmiquement" sur chaque sonnerie :
- Détecte le BPM
- Propose des points de boucle
- Crée une version bouclée

---

## 📊 Performance et Optimisations

### Optimisations

1. **Traitement Asynchrone**
   - Utiliser `OfflineAudioContext` pour traitement non-bloquant
   - Web Workers pour calculs lourds (optionnel)

2. **Cache des Résultats**
   - Stocker le BPM détecté dans les métadonnées de la sonnerie
   - Éviter de re-détecter si déjà calculé

3. **Analyse Progressive**
   - Analyser d'abord un échantillon (10-20s) pour BPM rapide
   - Affiner avec l'audio complet si nécessaire

4. **FFT Optimisé**
   - Utiliser des tailles de fenêtre adaptatives
   - Réutiliser les buffers FFT

### Métriques de Performance

- Détection BPM : < 2s pour 1 minute d'audio
- Détection boucles : < 3s pour 1 minute d'audio
- Création boucle : < 1s

---

## 🚀 Plan d'Implémentation par Phases

### Phase 1 : Fondations (Semaine 1)
- [ ] Créer `bpmDetection.service.ts` avec autocorrélation basique
- [ ] Implémenter détection d'onsets
- [ ] Tests unitaires pour détection BPM
- [ ] Types TypeScript (`bpm.types.ts`)

### Phase 2 : Détection de Boucles (Semaine 2)
- [ ] Créer `loopDetection.service.ts`
- [ ] Implémenter phase alignment
- [ ] Tests unitaires pour détection de boucles
- [ ] Intégration avec BPM detection

### Phase 3 : Synchronisation (Semaine 2-3)
- [ ] Créer `rhythmSync.service.ts`
- [ ] Implémenter crossfade pour boucles
- [ ] Tests d'intégration complets
- [ ] Optimisations de performance

### Phase 4 : Hooks React (Semaine 3)
- [ ] Créer `useBPMDetection.ts`
- [ ] Créer `useLoopSync.ts`
- [ ] Tests des hooks

### Phase 5 : UI (Semaine 4)
- [ ] Composant `BPMDetector.tsx`
- [ ] Composant `LoopPointEditor.tsx`
- [ ] Composant `RhythmVisualizer.tsx`
- [ ] Intégration dans `Record.tsx`
- [ ] Intégration dans `Dashboard.tsx`

### Phase 6 : Polish (Semaine 4-5)
- [ ] Gestion d'erreurs complète
- [ ] Feedback utilisateur (loading, progress)
- [ ] Documentation JSDoc
- [ ] Tests E2E
- [ ] Optimisations finales

---

## 📚 Références Techniques

### Algorithmes
- **Onset Detection** : "Onset Detection Algorithms for Music Information Retrieval" (Bello et al., 2005)
- **Autocorrelation** : "Beat Tracking by Dynamic Programming" (Ellis, 2007)
- **Phase Alignment** : Techniques de crossfade et corrélation croisée

### Bibliothèques de Référence (non utilisées, pour inspiration)
- `essentia.js` (analyse audio)
- `tone.js` (traitement audio)
- `web-audio-beat-detector` (détection BPM)

### Web Audio API
- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN: OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)
- [MDN: AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)

---

## ⚠️ Limitations et Cas Particuliers

### Limitations

1. **Audio sans rythme clair**
   - Parole, bruit ambiant → BPM non détectable
   - Solution : Désactiver la synchronisation, utiliser mode normal

2. **Tempo variable**
   - Musique avec accélération/ralentissement
   - Solution : Détecter le tempo moyen, ou permettre sélection manuelle

3. **Audio très court (< 2 secondes)**
   - Pas assez de données pour détection fiable
   - Solution : Utiliser mode normal sans synchronisation

4. **Performance sur mobile**
   - Calculs intensifs peuvent être lents
   - Solution : Analyser un échantillon réduit, optimiser les algorithmes

### Gestion d'Erreurs

- BPM non détectable → Fallback sur mode normal
- Points de boucle de mauvaise qualité → Avertir l'utilisateur
- Erreurs de traitement → Messages clairs, possibilité de réessayer

---

## ✅ Checklist de Validation

### Fonctionnalités
- [ ] Détection BPM précise (erreur < 5 BPM) pour musique rythmée
- [ ] Détection de points de boucle avec qualité > 0.7
- [ ] Création de boucles sans coupure audible
- [ ] Interface utilisateur intuitive
- [ ] Intégration avec workflow existant

### Qualité
- [ ] Tests unitaires (couverture > 80%)
- [ ] Tests d'intégration
- [ ] Performance acceptable (< 3s pour 1 min d'audio)
- [ ] Gestion d'erreurs complète
- [ ] Documentation JSDoc

### UX
- [ ] Feedback visuel pendant traitement
- [ ] Messages d'erreur clairs
- [ ] Prévisualisation de la boucle
- [ ] Mobile-friendly

---

*Document créé le : 2025-01-27*  
*Dernière mise à jour : 2025-01-27*

