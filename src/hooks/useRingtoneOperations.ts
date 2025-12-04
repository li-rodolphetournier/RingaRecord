import { useCallback, useState, useTransition } from 'react';
import type { Ringtone } from '../types/ringtone.types';
import { optimizeRingtone } from '../services/audio/smartRingtone.service';
import { buildRingtonesForSegments } from '../services/audio/ringtoneSegments.service';
import { applyEqualizerPresetToBlob } from '../services/audio/equalizer.service';
import { fetchBlobFromUrl, prepareRingtoneFromBlob } from '../utils/ringtoneFile.utils';
import { useErrorHandler } from './useErrorHandler';
import { useRingtoneStore } from '../stores/ringtoneStore';
import type { EqualizerPreset } from '../types/equalizer.types';
import type { SmartRingtoneSegment } from '../services/audio/smartRingtone.service';

/**
 * Options pour l'optimisation d'une sonnerie existante
 */
export interface OptimizeRingtoneOptions {
  trimStart?: number;
  trimEnd?: number;
  hasManualTrim?: boolean;
}

/**
 * Hook partagé pour les opérations sur les sonneries existantes
 * Centralise la logique d'optimisation, Smart Ringtone, égaliseur, etc.
 * Utilisé par Dashboard et RingtoneDetailsModal pour éviter la duplication
 */
export const useRingtoneOperations = () => {
  const { upload, fetchAll } = useRingtoneStore();
  const { handleError, showSuccess } = useErrorHandler();
  const [, startTransition] = useTransition();

  const [isOptimizing, setIsOptimizing] = useState(false);

  /**
   * Optimise une sonnerie existante
   * @param ringtone - La sonnerie à optimiser
   * @param options - Options d'optimisation (trim, etc.)
   */
  const optimize = useCallback(
    async (ringtone: Ringtone, options?: OptimizeRingtoneOptions): Promise<void> => {
      try {
        startTransition(() => {
          setIsOptimizing(true);
        });

        const originalBlob = await fetchBlobFromUrl(
          ringtone.fileUrl,
          'Erreur lors du téléchargement de la sonnerie à optimiser',
        );

        const optimizeOptions =
          options?.hasManualTrim && ringtone.duration > 1
            ? {
                manualStartSeconds: Math.max(
                  0,
                  Math.min(options.trimStart ?? 0, ringtone.duration - 1),
                ),
                manualEndSeconds: Math.max(
                  Math.max(0, Math.min((options.trimStart ?? 0) + 1, ringtone.duration)),
                  Math.min(options.trimEnd ?? ringtone.duration, ringtone.duration),
                ),
              }
            : undefined;

        const { optimizedBlob, durationSeconds } = await optimizeRingtone(originalBlob, optimizeOptions);

        const baseTitle = `${ringtone.title} (opt)`;
        const { file, duration } = prepareRingtoneFromBlob({
          blob: optimizedBlob,
          title: baseTitle,
          format: ringtone.format,
          duration: Number.isFinite(durationSeconds) ? durationSeconds : ringtone.duration,
          mimeType: optimizedBlob.type,
        });

        await upload(file, baseTitle, ringtone.format, duration);
        showSuccess(`Version optimisée créée : ${baseTitle}`);
        await fetchAll();
      } catch (error) {
        handleError(error, 'optimisation de sonnerie');
      } finally {
        startTransition(() => {
          setIsOptimizing(false);
        });
      }
    },
    [upload, fetchAll, handleError, showSuccess],
  );

  /**
   * Applique un égaliseur à une sonnerie existante
   * @param ringtone - La sonnerie à égaliser
   * @param blob - Le blob source (doit être chargé au préalable)
   * @param preset - Le preset d'égaliseur à appliquer
   */
  const applyEqualizer = useCallback(
    async (
      ringtone: Ringtone,
      blob: Blob,
      preset: EqualizerPreset | null,
    ): Promise<void> => {
      if (!preset) {
        handleError(new Error('Aucun preset sélectionné'), 'application égaliseur');
        return;
      }

      try {
        const result = await applyEqualizerPresetToBlob(blob, preset);

        const baseTitle = `${ringtone.title} (égalisé)`;
        const { file, duration } = prepareRingtoneFromBlob({
          blob: result.equalizedBlob,
          title: baseTitle,
          format: ringtone.format,
          duration:
            result.durationSeconds !== null && Number.isFinite(result.durationSeconds)
              ? result.durationSeconds
              : ringtone.duration,
          mimeType: result.equalizedBlob.type,
        });

        await upload(file, baseTitle, ringtone.format, duration);
        showSuccess(`Version égalisée créée : ${baseTitle}`);
        await fetchAll();
      } catch (error) {
        handleError(error, 'application égaliseur');
      }
    },
    [upload, fetchAll, handleError, showSuccess],
  );

  /**
   * Crée des versions d'une sonnerie à partir de segments sélectionnés
   * @param ringtone - La sonnerie source
   * @param blob - Le blob source (doit être chargé au préalable)
   * @param segments - Les segments à utiliser
   * @param selectedSegmentIds - IDs des segments sélectionnés
   */
  const createSegmentVersions = useCallback(
    async (
      ringtone: Ringtone,
      blob: Blob,
      segments: SmartRingtoneSegment[],
      selectedSegmentIds: number[],
    ): Promise<void> => {
      if (segments.length === 0 || selectedSegmentIds.length === 0) {
        handleError(new Error('Sélectionnez au moins une partie à garder'), 'création par parties');
        return;
      }

      try {
        const selectedSegments = segments.filter((segment) =>
          selectedSegmentIds.includes(segment.id),
        );

        const builtRingtones = await buildRingtonesForSegments(blob, selectedSegments);

        for (const built of builtRingtones) {
          if (!Number.isFinite(built.durationSeconds) || built.durationSeconds < 1) {
            continue;
          }

          const partTitle = `${ringtone.title} (partie ${built.segmentId})`;
          const { file, duration } = prepareRingtoneFromBlob({
            blob: built.blob,
            title: partTitle,
            format: ringtone.format,
            duration: built.durationSeconds,
            mimeType: built.blob.type,
          });

          await upload(file, partTitle, ringtone.format, duration);
        }

        showSuccess('Sonneries par partie créées ✔️');
        await fetchAll();
      } catch (error) {
        handleError(error, 'création par parties');
      }
    },
    [upload, fetchAll, handleError, showSuccess],
  );

  /**
   * Télécharge le blob d'une sonnerie depuis son URL
   * @param ringtone - La sonnerie à télécharger
   * @param errorContext - Contexte pour le message d'erreur
   * @returns Le blob téléchargé
   */
  const fetchRingtoneBlob = useCallback(
    async (ringtone: Ringtone, errorContext?: string): Promise<Blob> => {
      try {
        return await fetchBlobFromUrl(
          ringtone.fileUrl,
          errorContext || 'Erreur lors du téléchargement de la sonnerie',
        );
      } catch (error) {
        handleError(error, errorContext || 'téléchargement sonnerie');
        throw error; // Re-lancer pour que l'appelant puisse gérer
      }
    },
    [handleError],
  );

  return {
    optimize,
    applyEqualizer,
    createSegmentVersions,
    fetchRingtoneBlob,
    isOptimizing,
  };
};

