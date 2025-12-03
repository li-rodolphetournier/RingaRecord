/**
 * Types pour la synchronisation rythmique et création de boucles
 */

export interface LoopPoint {
  /** Début de la boucle en secondes */
  startSeconds: number;
  /** Fin de la boucle en secondes */
  endSeconds: number;
  /** Qualité de la boucle (0-1, 1 = parfaite) */
  quality: number;
  /** Nombre de beats dans la boucle */
  beatsCount: number;
  /** Nombre de mesures (beatsCount / 4) */
  measureCount: number;
}

export interface LoopDetectionOptions {
  /** BPM détecté */
  bpm: number;
  /** Nombre de beats par boucle (1, 2, 4, 8, 16) */
  beatsPerLoop?: number;
  /** Durée minimale en secondes (défaut: 1s) */
  minLoopDuration?: number;
  /** Durée maximale en secondes (défaut: 40s) */
  maxLoopDuration?: number;
  /** Seuil minimum de qualité (défaut: 0.7) */
  qualityThreshold?: number;
}

export interface RhythmSyncOptions {
  /** BPM détecté */
  bpm: number;
  /** Nombre de beats par boucle */
  beatsPerLoop: number;
  /** Début de la boucle en secondes (optionnel, sinon détection auto) */
  loopStartSeconds?: number;
  /** Fin de la boucle en secondes (optionnel, sinon détection auto) */
  loopEndSeconds?: number;
  /** Durée du crossfade en millisecondes (défaut: 50ms) */
  crossfadeDurationMs?: number;
  /** Aligner sur la grille rythmique (défaut: true) */
  snapToBeat?: boolean;
}

export interface SyncedLoopResult {
  /** Blob audio de la boucle synchronisée */
  loopedBlob: Blob;
  /** Durée en secondes */
  durationSeconds: number;
  /** Point de boucle utilisé */
  loopPoint: LoopPoint;
  /** Qualité de la boucle finale */
  quality: number;
}

