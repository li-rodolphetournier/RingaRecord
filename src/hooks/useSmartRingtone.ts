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
  segments: SmartRingtoneResult['segments'];
  silenceThresholdDb: number;
  minSilenceDurationMs: number;
  selectedSegmentIds: number[];
}

export interface UseSmartRingtoneReturn extends UseSmartRingtoneState {
  optimize: (original: Blob, options?: SmartRingtoneOptions) => Promise<void>;
  reset: () => void;
  setSilenceThresholdDb: (value: number) => void;
  setMinSilenceDurationMs: (value: number) => void;
  toggleSegmentSelection: (id: number) => void;
  selectOnlySegment: (id: number) => void;
}

export const useSmartRingtone = (): UseSmartRingtoneReturn => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [optimizedDuration, setOptimizedDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<SmartRingtoneResult['segments']>([]);
  const [silenceThresholdDb, setSilenceThresholdDbState] = useState<number>(-40);
  const [minSilenceDurationMs, setMinSilenceDurationMsState] = useState<number>(200);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<number[]>([]);

  const optimize = useCallback(
    async (original: Blob, options?: SmartRingtoneOptions) => {
      setIsOptimizing(true);
      setError(null);

      try {
        const result: SmartRingtoneResult = await optimizeRingtone(original, {
          silenceThresholdDb,
          minSilenceDurationMs,
          ...options,
        });
        setOptimizedBlob(result.optimizedBlob);
        setOptimizedDuration(result.durationSeconds);
        setSegments(result.segments);
        if (result.segments.length > 0) {
          setSelectedSegmentIds([result.segments[0].id]);
        } else {
          setSelectedSegmentIds([]);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de l'optimisation de la sonnerie";
        setError(message);
        setOptimizedBlob(null);
        setOptimizedDuration(null);
        setSegments([]);
        setSelectedSegmentIds([]);
      } finally {
        setIsOptimizing(false);
      }
    },
    [minSilenceDurationMs, silenceThresholdDb],
  );

  const reset = useCallback(() => {
    setOptimizedBlob(null);
    setOptimizedDuration(null);
    setError(null);
    setSegments([]);
    setSelectedSegmentIds([]);
  }, []);

  const setSilenceThresholdDb = useCallback((value: number) => {
    setSilenceThresholdDbState(value);
  }, []);

  const setMinSilenceDurationMs = useCallback((value: number) => {
    setMinSilenceDurationMsState(value);
  }, []);

  const toggleSegmentSelection = useCallback((id: number) => {
    setSelectedSegmentIds((prev) =>
      prev.includes(id) ? prev.filter((existingId) => existingId !== id) : [...prev, id],
    );
  }, []);

  const selectOnlySegment = useCallback((id: number) => {
    setSelectedSegmentIds([id]);
  }, []);

  return {
    isOptimizing,
    optimizedBlob,
    optimizedDuration,
    error,
    segments,
    silenceThresholdDb,
    minSilenceDurationMs,
    selectedSegmentIds,
    optimize,
    reset,
    setSilenceThresholdDb,
    setMinSilenceDurationMs,
    toggleSegmentSelection,
    selectOnlySegment,
  };
};
