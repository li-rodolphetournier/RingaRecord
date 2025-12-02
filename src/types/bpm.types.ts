export interface BPMDetectionResult {
  bpm: number;
  /**
   * Score de confiance dans [0, 1].
   * 0 = très incertain, 1 = très fiable.
   */
  confidence: number;
  /**
   * Méthode principale utilisée pour la détection.
   */
  method: 'autocorrelation' | 'energy';
}

export interface BPMDetectionOptions {
  /**
   * BPM minimal à détecter (par défaut 60).
   */
  minBPM?: number;
  /**
   * BPM maximal à détecter (par défaut 200).
   */
  maxBPM?: number;
}


