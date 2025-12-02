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

      if (!audio || !segment) {
        if (onError) {
          onError("Impossible de lire ce segment audio", null);
        }
        return;
      }

      setActiveSegmentId(segmentId);
      audio.currentTime = segment.startSeconds;
      audio
        .play()
        .catch((error: unknown) => {
          if (onError) {
            onError("Impossible de lire ce segment audio", error);
          }
        });
    },
    [onError, segments],
  );

  return {
    audioRef,
    activeSegmentId,
    playSegment,
    stop,
  };
};


