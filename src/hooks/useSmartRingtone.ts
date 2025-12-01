import { useState, useCallback } from 'react';
import {
  optimizeRingtone,
  type SmartRingtoneOptions,
  type SmartRingtoneResult,
} from '../services/audio/smartRingtone.service';

export interface UseSmartRingtoneState {
  isOptimizing: boolean;
  optimizedBlob: Blob | null;
  optimizedDuration: number | null;
  error: string | null;
}

export interface UseSmartRingtoneReturn extends UseSmartRingtoneState {
  optimize: (original: Blob, options?: SmartRingtoneOptions) => Promise<void>;
  reset: () => void;
}

export const useSmartRingtone = (): UseSmartRingtoneReturn => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [optimizedDuration, setOptimizedDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optimize = useCallback(
    async (original: Blob, options?: SmartRingtoneOptions) => {
      setIsOptimizing(true);
      setError(null);

      try {
        const result: SmartRingtoneResult = await optimizeRingtone(original, options);
        setOptimizedBlob(result.optimizedBlob);
        setOptimizedDuration(result.durationSeconds);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de l'optimisation de la sonnerie";
        setError(message);
        setOptimizedBlob(null);
        setOptimizedDuration(null);
      } finally {
        setIsOptimizing(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setOptimizedBlob(null);
    setOptimizedDuration(null);
    setError(null);
  }, []);

  return {
    isOptimizing,
    optimizedBlob,
    optimizedDuration,
    error,
    optimize,
    reset,
  };
};
