import { useState, useCallback } from 'react';
import { detectBPMFromBlob } from '../services/audio/bpmDetection.service';
import type { BPMDetectionResult, BPMDetectionOptions } from '../types/bpm.types';

export interface UseBPMDetectionState {
  isDetecting: boolean;
  result: BPMDetectionResult | null;
  error: string | null;
}

export interface UseBPMDetectionReturn extends UseBPMDetectionState {
  detectFromBlob: (blob: Blob, options?: BPMDetectionOptions) => Promise<void>;
  reset: () => void;
}

export const useBPMDetection = (): UseBPMDetectionReturn => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<BPMDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectFromBlob = useCallback(
    async (blob: Blob, options?: BPMDetectionOptions) => {
      setIsDetecting(true);
      setError(null);

      try {
        const detectionResult = await detectBPMFromBlob(blob, options);
        setResult(detectionResult);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors de la détection du BPM';
        setError(message);
        setResult(null);
      } finally {
        setIsDetecting(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setIsDetecting(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    isDetecting,
    result,
    error,
    detectFromBlob,
    reset,
  };
};


