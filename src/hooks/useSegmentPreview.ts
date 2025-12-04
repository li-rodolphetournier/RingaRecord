import { useCallback, useEffect, useRef, useState } from 'react';
import type { SmartRingtoneSegment } from '../services/audio/smartRingtone.service';

export interface UseSegmentPreviewOptions {
  segments: SmartRingtoneSegment[];
  /**
   * Callback facultative en cas d'erreur de lecture.
   * Permet, par exemple, d'afficher un toast dans le composant appelant.
   */
  onError?: (message: string, error?: unknown) => void;
}

export interface UseSegmentPreviewReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  activeSegmentId: number | null;
  playSegment: (segmentId: number) => void;
  stop: () => void;
  isPreparing: boolean;
}

/**
 * Hook réutilisable pour la pré-écoute de segments d'un même fichier audio.
 * - Utilise un seul élément <audio>
 * - Limite la lecture entre startSeconds / endSeconds du segment actif
 */
export const useSegmentPreview = (
  options: UseSegmentPreviewOptions,
): UseSegmentPreviewReturn => {
  const { segments, onError } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || activeSegmentId == null) {
      return;
    }

    const segment = segments.find((s) => s.id === activeSegmentId);
    if (!segment) {
      return;
    }

    const handleTimeUpdate = () => {
      if (audio.currentTime >= segment.endSeconds) {
        audio.pause();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [activeSegmentId, segments]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
  }, []);

  const playSegment = useCallback(
    (segmentId: number) => {
      const audio = audioRef.current;
      const segment = segments.find((s) => s.id === segmentId);

      // Activer l'état de préparation dès le clic pour afficher le loader le plus tôt possible
      setIsPreparing(true);

      if (!audio || !segment) {
        setIsPreparing(false);
        if (onError) {
          onError('Impossible de lire ce segment audio', null);
        }
        return;
      }

      const hasValidDuration =
        Number.isFinite(audio.duration) &&
        typeof audio.duration === 'number' &&
        audio.duration > 0;

      const startPlayback = () => {
        if (!audio) {
          return;
        }

        const safeDuration =
          Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;

        const maxSafeStart = Math.max(0, safeDuration - 0.1);
        const safeStart = Math.max(0, Math.min(segment.startSeconds, maxSafeStart));

        // Arrêter la lecture en cours avant de changer de segment
        audio.pause();

        setActiveSegmentId(segmentId);
        audio.currentTime = safeStart;
        audio
          .play()
          .catch((error: unknown) => {
            // Certains navigateurs rejettent la promesse avec AbortError / NotAllowedError
            // dans des cas bénins (changement rapide, focus, autorisation) : on les ignore.
            if (error && typeof error === 'object' && 'name' in error) {
              const name = (error as { name?: string }).name;
              if (name === 'AbortError' || name === 'NotAllowedError') {
                return;
              }
            }

            if (onError) {
              onError('Impossible de lire ce segment audio', error);
            }
          })
          .finally(() => {
            setIsPreparing(false);
          });
      };

      // Si la durée n'est pas encore disponible, attendre le chargement des métadonnées
      if (!hasValidDuration) {
        setIsPreparing(true);

        const handleLoadedMetadata = () => {
          startPlayback();
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.load();
        return;
      }

      // Métadonnées déjà disponibles : démarrer directement
      setIsPreparing(false);
      startPlayback();
    },
    [onError, segments],
  );

  return {
    audioRef,
    activeSegmentId,
    playSegment,
    stop,
    isPreparing,
  };
};


