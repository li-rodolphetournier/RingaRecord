import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useAudioRecorder } from './useAudioRecorder';
import { useSmartRingtone } from './useSmartRingtone';
import { useBPMDetection } from './useBPMDetection';
import { useEqualizer } from './useEqualizer';
import { useLoopSync } from './useLoopSync';
import { useErrorHandler } from './useErrorHandler';
import { prepareRingtoneFromBlob } from '../utils/ringtoneFile.utils';
import { buildRingtonesForSegments } from '../services/audio/ringtoneSegments.service';
import { getBrowserSupport, isRecordingModeSupported, type RecordingMode } from '../utils/browserSupport';

/**
 * Hook personnalisé pour gérer toute la logique de la page Record
 * Suit les best practices React en séparant la logique de la présentation
 */
export const useRecordPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { upload, isLoading: isUploading } = useRingtoneStore();
  const { handleError, showSuccess, showError, showWarning, showInfo } = useErrorHandler();

  // États locaux
  const [title, setTitle] = useState('');
  const [gain, setGain] = useState(2.0);
  const [maxDuration, setMaxDuration] = useState<number>(120); // Durée maximum d'enregistrement en secondes
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('microphone');
  const [lastOriginalBlob, setLastOriginalBlob] = useState<Blob | null>(null);
  const [useOptimizedVersion, setUseOptimizedVersion] = useState<boolean>(true);
  const [useManualTrim, setUseManualTrim] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [isSegmentPlaying, setIsSegmentPlaying] = useState<boolean>(false);

  // Hooks personnalisés
  const bpmDetection = useBPMDetection();
  const audioRecorder = useAudioRecorder({ gain, mode: recordingMode });
  const smartRingtone = useSmartRingtone();
  const equalizer = useEqualizer();
  const loopSync = useLoopSync();

  // Détecter le support navigateur
  const browserSupport = getBrowserSupport();

  // Vérifier l'authentification
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // S'assurer que le mode sélectionné est supporté
  useEffect(() => {
    if (!isRecordingModeSupported(recordingMode)) {
      if (recordingMode === 'system') {
        // Utiliser setTimeout pour éviter setState dans useEffect
        setTimeout(() => {
          setRecordingMode('microphone');
          showWarning('Le mode son système n\'est pas disponible sur votre navigateur. Mode microphone activé.');
        }, 0);
      }
    }
  }, [recordingMode, showWarning]);

  // Mettre à jour les bornes de découpe quand la durée change
  useEffect(() => {
    if (audioRecorder.duration > 0) {
      // Utiliser setTimeout pour éviter setState dans useEffect
      setTimeout(() => {
        setTrimStart((prev) => Math.max(0, Math.min(prev, audioRecorder.duration - 1)));
        setTrimEnd((prev) => {
          if (prev <= 0 || prev > audioRecorder.duration) {
            return audioRecorder.duration;
          }
          if (prev <= trimStart) {
            return Math.min(audioRecorder.duration, trimStart + 1);
          }
          return prev;
        });
      }, 0);
    } else {
      setTimeout(() => {
        setTrimStart(0);
        setTrimEnd(0);
      }, 0);
    }
  }, [audioRecorder.duration, trimStart]);

  // Limiter la lecture au segment actif pour la pré-écoute
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio || activeSegmentId == null) {
      return;
    }

    const segment = smartRingtone.segments.find((s) => s.id === activeSegmentId);
    if (!segment) {
      return;
    }

    const handleTimeUpdate = () => {
      if (audio.currentTime >= segment.endSeconds) {
        audio.pause();
        setIsSegmentPlaying(false);
      }
    };

    const handlePlay = () => {
      setIsSegmentPlaying(true);
    };

    const handlePause = () => {
      setIsSegmentPlaying(false);
    };

    const handleEnded = () => {
      setIsSegmentPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activeSegmentId, smartRingtone.segments]);

  // Gestionnaires d'erreurs
  useEffect(() => {
    if (audioRecorder.error) {
      showError(audioRecorder.error);
    }
  }, [audioRecorder.error, showError]);

  useEffect(() => {
    if (smartRingtone.error) {
      showError(smartRingtone.error);
    }
  }, [smartRingtone.error, showError]);

  useEffect(() => {
    if (equalizer.error) {
      showError(equalizer.error);
    }
  }, [equalizer.error, showError]);

  useEffect(() => {
    if (loopSync.error) {
      showError(loopSync.error);
    }
  }, [loopSync.error, showError]);

  useEffect(() => {
    if (bpmDetection.error) {
      showError(bpmDetection.error);
    }
  }, [bpmDetection.error, showError]);

  // Handlers
  const handleStart = useCallback(async () => {
    try {
      await audioRecorder.startRecording();
      if (recordingMode === 'system') {
        showInfo('Sélectionnez l\'onglet ou l\'application avec le son à capturer');
      }
    } catch (error) {
      handleError(error, 'démarrage enregistrement');
    }
  }, [audioRecorder, recordingMode, showInfo, handleError]);

  const handleStop = useCallback(() => {
    audioRecorder.stopRecording();
  }, [audioRecorder]);

  const handlePlaySegment = useCallback((segmentId: number) => {
    const audio = previewAudioRef.current;
    const segment = smartRingtone.segments.find((s) => s.id === segmentId);

    if (!audio || !segment) {
      showError('Impossible de lire ce segment audio');
      return;
    }

    // Si le même segment est déjà en cours de lecture, mettre en pause
    if (activeSegmentId === segmentId && isSegmentPlaying) {
      audio.pause();
      setIsSegmentPlaying(false);
      return;
    }

    const hasValidDuration =
      Number.isFinite(audio.duration) && typeof audio.duration === 'number' && audio.duration > 0;

    if (!hasValidDuration) {
      showInfo('Chargement de l\'audio, réessayez dans un instant');
      return;
    }

    const maxSafeStart = Math.max(0, audio.duration - 0.1);
    const safeStart = Math.max(0, Math.min(segment.startSeconds, maxSafeStart));

    try {
      // Si on change de segment, arrêter la lecture en cours
      if (activeSegmentId !== segmentId) {
        audio.pause();
      }

      setActiveSegmentId(segmentId);
      audio.currentTime = safeStart;
      void audio.play().catch((error) => {
        handleError(error, 'lecture segment audio');
        setIsSegmentPlaying(false);
      });
    } catch (error) {
      handleError(error, 'lecture segment audio');
      setIsSegmentPlaying(false);
    }
  }, [smartRingtone.segments, activeSegmentId, isSegmentPlaying, showError, showInfo, handleError]);

  const handleOptimize = useCallback(async () => {
    const originalBlob = audioRecorder.getAudioBlob();
    if (!originalBlob) {
      showError('Aucun enregistrement disponible pour optimisation');
      return;
    }

    setLastOriginalBlob(originalBlob);
    equalizer.reset();
    try {
      const options =
        useManualTrim && audioRecorder.duration > 1
          ? {
              manualStartSeconds: Math.max(0, Math.min(trimStart, audioRecorder.duration - 1)),
              manualEndSeconds: Math.max(
                Math.max(0, Math.min(trimStart + 1, audioRecorder.duration)),
                Math.min(trimEnd, audioRecorder.duration),
              ),
              maxDurationSeconds: maxDuration,
            }
          : {
              maxDurationSeconds: maxDuration,
            };

      await smartRingtone.optimize(originalBlob, options);
      setUseOptimizedVersion(true);
      showSuccess('Sonnerie optimisée ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  }, [audioRecorder, useManualTrim, trimStart, trimEnd, smartRingtone, equalizer, showError, showSuccess, maxDuration]);

  const handleAnalyzeSpectrum = useCallback(async () => {
    const baseBlob = lastOriginalBlob ?? audioRecorder.getAudioBlob();
    if (!baseBlob) {
      showError('Aucun enregistrement disponible pour analyse');
      return;
    }

    try {
      await equalizer.analyzeAndSuggest(baseBlob);
      showSuccess('Analyse spectrale terminée ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  }, [lastOriginalBlob, audioRecorder, equalizer, showError, showSuccess]);

  const handlePreviewEqualizer = useCallback(async (preset: typeof equalizer.selectedPreset) => {
    const baseBlob = lastOriginalBlob ?? audioRecorder.getAudioBlob();
    if (!baseBlob) {
      showError('Aucun enregistrement disponible pour prévisualisation');
      return;
    }

    try {
      await equalizer.previewPreset(baseBlob, preset);
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  }, [lastOriginalBlob, audioRecorder, equalizer, showError]);

  const handleApplyEqualizer = useCallback(async () => {
    const baseBlob = lastOriginalBlob ?? audioRecorder.getAudioBlob();
    if (!baseBlob) {
      showError('Aucun enregistrement disponible pour égalisation');
      return;
    }

    try {
      await equalizer.applyPreset(baseBlob, equalizer.selectedPreset);
      setUseOptimizedVersion(false);
      showSuccess('Égalisation appliquée ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  }, [lastOriginalBlob, audioRecorder, equalizer, showError, showSuccess]);

  const handleDetectBPM = useCallback(async () => {
    const baseBlob = lastOriginalBlob ?? audioRecorder.getAudioBlob();

    if (!baseBlob) {
      showError('Aucun enregistrement disponible pour analyser le BPM');
      return;
    }

    try {
      await bpmDetection.detectFromBlob(baseBlob, {
        minBPM: 60,
        maxBPM: 200,
      });
      loopSync.reset();
    } catch (error) {
      handleError(error, 'détection BPM');
    }
  }, [lastOriginalBlob, audioRecorder, bpmDetection, loopSync, showError, handleError]);

  const handleDetectLoops = useCallback(async () => {
    if (!bpmDetection.result) {
      showError('Détectez d\'abord le BPM avant de chercher les points de boucle');
      return;
    }

    const baseBlob = lastOriginalBlob ?? audioRecorder.getAudioBlob();
    if (!baseBlob) {
      showError('Aucun enregistrement disponible');
      return;
    }

    try {
      await loopSync.detectLoops(baseBlob, bpmDetection.result.bpm, 4);
      showSuccess('Points de boucle détectés ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  }, [bpmDetection.result, lastOriginalBlob, audioRecorder, loopSync, showError, showSuccess]);

  const handleCreateSyncedLoop = useCallback(async (beatsPerLoop: number) => {
    try {
      await loopSync.createSyncedLoop(beatsPerLoop, 50);
      setUseOptimizedVersion(false);
      showSuccess('Boucle synchronisée créée ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  }, [loopSync, showSuccess]);

  const getBlobDuration = useCallback(async (blob: Blob): Promise<number | null> => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const rawDuration = audioBuffer.duration;
      if (!Number.isFinite(rawDuration) || rawDuration <= 0 || rawDuration > 300) {
        console.warn('Durée audio invalide:', rawDuration);
        await audioContext.close();
        return null;
      }
      
      const seconds = Math.round(rawDuration);
      await audioContext.close();
      
      if (seconds < 1 || seconds > maxDuration) {
        console.warn(`Durée hors plage acceptable pour sonnerie (max: ${maxDuration}s):`, seconds);
      }
      
      return seconds;
    } catch (durationError) {
      console.error('Impossible de calculer la durée audio:', durationError);
      return null;
    }
  }, [maxDuration]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      showError('Veuillez entrer un titre');
      return;
    }

    const extension = audioRecorder.fileExtension || 'm4a';

    try {
      // Cas multi-parties : découpe automatique avec segments sélectionnés
      if (!useManualTrim && smartRingtone.segments.length > 0 && smartRingtone.selectedSegmentIds.length > 0) {
        const originalBlobForSegments = lastOriginalBlob ?? audioRecorder.getAudioBlob();
        if (!originalBlobForSegments) {
          showError('Aucun enregistrement disponible pour créer les sonneries par partie');
          return;
        }

        const selectedSegments = smartRingtone.segments.filter((segment) =>
          smartRingtone.selectedSegmentIds.includes(segment.id),
        );

        if (selectedSegments.length === 0) {
          showError('Sélectionnez au moins une partie à garder');
          return;
        }

        try {
          const builtRingtones = await buildRingtonesForSegments(
            originalBlobForSegments,
            selectedSegments,
          );

          for (const built of builtRingtones) {
            if (!Number.isFinite(built.durationSeconds) || built.durationSeconds < 1) {
              continue;
            }

            const partTitle = `${title} (partie ${built.segmentId})`;
            const { file, duration } = prepareRingtoneFromBlob({
              blob: built.blob,
              title: partTitle,
              format: extension as 'm4a' | 'mp3' | 'wav' | 'ogg',
              duration: built.durationSeconds,
              mimeType: audioRecorder.recordingMimeType || 'audio/mp4',
            });

            await upload(file, partTitle, extension, duration);
          }

          showSuccess('Sonneries par partie créées ✔️');
          setTitle('');
        } catch (error) {
          handleError(error, 'création sonneries par partie');
        }
        return;
      }

      // Cas normal : une seule sonnerie
      const blobToSave =
        useOptimizedVersion && (smartRingtone.optimizedBlob || equalizer.equalizedBlob || loopSync.syncedBlob)
          ? loopSync.syncedBlob || equalizer.equalizedBlob || smartRingtone.optimizedBlob
          : lastOriginalBlob ?? audioRecorder.getAudioBlob();

      if (!blobToSave) {
        showError('Aucun enregistrement disponible');
        return;
      }

      const duration = await getBlobDuration(blobToSave);
      if (!duration || duration < 1 || duration > maxDuration) {
        showError(`La durée doit être entre 1 et ${maxDuration} secondes pour une sonnerie`);
        return;
      }

      const clampedDuration = Math.max(1, Math.min(maxDuration, Math.round(duration)));
      const { file } = prepareRingtoneFromBlob({
        blob: blobToSave,
        title: title.trim(),
        format: extension as 'm4a' | 'mp3' | 'wav' | 'ogg',
        duration: clampedDuration,
        mimeType: audioRecorder.recordingMimeType || 'audio/mp4',
      });

      await upload(file, title.trim(), extension, clampedDuration);
      showSuccess('Sonnerie enregistrée ✔️');
      setTitle('');
    } catch (error) {
      handleError(error, 'enregistrement sonnerie');
    }
  }, [
    title,
    useManualTrim,
    useOptimizedVersion,
    lastOriginalBlob,
    audioRecorder,
    smartRingtone,
    equalizer,
    loopSync,
    upload,
    showError,
    showSuccess,
    handleError,
    maxDuration,
    getBlobDuration,
  ]);

  return {
    // États
    title,
    setTitle,
    gain,
    setGain,
    maxDuration,
    setMaxDuration,
    recordingMode,
    setRecordingMode,
    useOptimizedVersion,
    setUseOptimizedVersion,
    useManualTrim,
    setUseManualTrim,
    trimStart,
    setTrimStart,
    trimEnd,
    setTrimEnd,
    lastOriginalBlob,
    activeSegmentId,
    isSegmentPlaying,
    previewAudioRef,
    browserSupport,

    // Hooks
    audioRecorder,
    smartRingtone,
    equalizer,
    loopSync,
    bpmDetection,

    // Handlers
    handleStart,
    handleStop,
    handlePlaySegment,
    handleOptimize,
    handleAnalyzeSpectrum,
    handlePreviewEqualizer,
    handleApplyEqualizer,
    handleDetectBPM,
    handleDetectLoops,
    handleCreateSyncedLoop,
    handleSave,

    // Utilitaires
    isUploading,
  };
};

