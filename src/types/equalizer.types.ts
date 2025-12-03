/**
 * Types pour l'égaliseur audio
 */

export type EqualizerPreset =
  | 'none'
  | 'bass-boost'
  | 'vocal-clarity'
  | 'bright'
  | 'warm'
  | 'rock'
  | 'pop'
  | 'jazz'
  | 'classical';

export interface EqualizerBand {
  /** Fréquence centrale en Hz */
  frequency: number;
  /** Gain en dB (-20 à +20) */
  gain: number;
  /** Q factor (qualité de la bande, 0.1 à 10) */
  q: number;
}

export interface EqualizerPresetConfig {
  id: EqualizerPreset;
  name: string;
  description: string;
  bands: EqualizerBand[];
}

export interface EqualizerResult {
  equalizedBlob: Blob;
  durationSeconds: number;
  presetUsed: EqualizerPreset;
}

export interface SpectralAnalysisResult {
  dominantFrequency: number;
  bassEnergy: number; // 0-1
  midEnergy: number; // 0-1
  trebleEnergy: number; // 0-1
  suggestedPreset: EqualizerPreset;
  confidence: number; // 0-1
}

