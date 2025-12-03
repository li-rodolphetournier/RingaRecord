import { useState, useCallback } from 'react';
import { findLoopPoints } from '../services/audio/loopDetection.service';
import { createSyncedLoop as createSyncedLoopService } from '../services/audio/rhythmSync.service';
import type { LoopPoint, RhythmSyncOptions } from '../types/rhythm.types';

export interface UseLoopSyncState {
  isDetecting: boolean;
  isCreating: boolean;
  loopPoints: LoopPoint[];
  selectedLoopPoint: LoopPoint | null;
  syncedBlob: Blob | null;
  durationSeconds: number | null;
  error: string | null;
}

export interface UseLoopSyncReturn extends UseLoopSyncState {
  detectLoops: (blob: Blob, bpm: number, beatsPerLoop?: number) => Promise<void>;
  createSyncedLoop: (beatsPerLoop: number, crossfadeMs?: number) => Promise<void>;
  selectLoopPoint: (point: LoopPoint) => void;
  reset: () => void;
}

export function useLoopSync(): UseLoopSyncReturn {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loopPoints, setLoopPoints] = useState<LoopPoint[]>([]);
  const [selectedLoopPoint, setSelectedLoopPoint] = useState<LoopPoint | null>(null);
  const [syncedBlob, setSyncedBlob] = useState<Blob | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceBpm, setSourceBpm] = useState<number | null>(null);
  const [sourceAudioBuffer, setSourceAudioBuffer] = useState<AudioBuffer | null>(null);

  const detectLoops = useCallback(
    async (blob: Blob, bpm: number, beatsPerLoop: number = 4) => {
      setIsDetecting(true);
      setError(null);
      setSourceBpm(bpm);

      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextClass) {
          throw new Error('Web Audio API non supportée');
        }

        const audioContext = new AudioContextClass();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        setSourceAudioBuffer(audioBuffer);

        const points = await findLoopPoints(audioBuffer, {
          bpm,
          beatsPerLoop,
        });

        setLoopPoints(points);
        if (points.length > 0) {
          setSelectedLoopPoint(points[0]); // Sélectionner le meilleur par défaut
        }

        await audioContext.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la détection des points de boucle";
        setError(message);
        setLoopPoints([]);
        setSelectedLoopPoint(null);
      } finally {
        setIsDetecting(false);
      }
    },
    [],
  );

  const createSyncedLoop = useCallback(
    async (beatsPerLoop: number, crossfadeMs: number = 50) => {
      if (!sourceAudioBuffer || !sourceBpm) {
        setError('Détection de boucles requise avant la création');
        return;
      }

      setIsCreating(true);
      setError(null);

      try {
        const options: RhythmSyncOptions = {
          bpm: sourceBpm,
          beatsPerLoop,
          loopStartSeconds: selectedLoopPoint?.startSeconds,
          loopEndSeconds: selectedLoopPoint?.endSeconds,
          crossfadeDurationMs: crossfadeMs,
          snapToBeat: true,
        };

        const result = await createSyncedLoopService(sourceAudioBuffer, options);
        setSyncedBlob(result.loopedBlob);
        setDurationSeconds(result.durationSeconds);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la création de la boucle synchronisée";
        setError(message);
        setSyncedBlob(null);
        setDurationSeconds(null);
      } finally {
        setIsCreating(false);
      }
    },
    [sourceAudioBuffer, sourceBpm, selectedLoopPoint],
  );

  const selectLoopPoint = useCallback((point: LoopPoint) => {
    setSelectedLoopPoint(point);
  }, []);

  const reset = useCallback(() => {
    setLoopPoints([]);
    setSelectedLoopPoint(null);
    setSyncedBlob(null);
    setDurationSeconds(null);
    setError(null);
    setSourceBpm(null);
    setSourceAudioBuffer(null);
  }, []);

  return {
    isDetecting,
    isCreating,
    loopPoints,
    selectedLoopPoint,
    syncedBlob,
    durationSeconds,
    error,
    detectLoops,
    createSyncedLoop,
    selectLoopPoint,
    reset,
  };
}

