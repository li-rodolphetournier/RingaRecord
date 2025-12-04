import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSmartRingtone } from '../hooks/useSmartRingtone';
import { useBPMDetection } from '../hooks/useBPMDetection';
import { useEqualizer } from '../hooks/useEqualizer';
import { useLoopSync } from '../hooks/useLoopSync';
import { buildRingtonesForSegments } from '../services/audio/ringtoneSegments.service';
import { Equalizer } from '../components/audio/Equalizer';
import { LoopPointEditor } from '../components/audio/LoopPointEditor';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { getBrowserSupport, isRecordingModeSupported, getSystemAudioHelpMessage, type RecordingMode } from '../utils/browserSupport';

export const Record = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { upload, isLoading: isUploading } = useRingtoneStore();
  
  // Déclarer gain et title avant l'appel à useAudioRecorder
  const [title, setTitle] = useState('');
  const [gain, setGain] = useState(2.0); // Gain par défaut : 2x (double le volume)
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('microphone');
  const [lastOriginalBlob, setLastOriginalBlob] = useState<Blob | null>(null);
  const [useOptimizedVersion, setUseOptimizedVersion] = useState<boolean>(true);
  const [useManualTrim, setUseManualTrim] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);

  const {
    isDetecting: isDetectingBPM,
    result: bpmResult,
    error: bpmError,
    detectFromBlob: detectBPMFromBlob,
    reset: resetBPM,
  } = useBPMDetection();

  const {
    isRecording,
    isPaused,
    duration,
    recordingMimeType,
    fileExtension,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getAudioBlob,
    error: recorderError,
  } = useAudioRecorder({ gain, mode: recordingMode });

  const {
    isOptimizing,
    optimizedBlob,
    error: smartError,
    optimize,
    segments,
    silenceThresholdDb,
    minSilenceDurationMs,
    selectedSegmentIds,
    setSilenceThresholdDb,
    setMinSilenceDurationMs,
    toggleSegmentSelection,
  } = useSmartRingtone();

  const {
    isProcessing: isEqualizing,
    isAnalyzing: isAnalyzingSpectrum,
    isPreviewing: isPreviewingEqualizer,
    equalizedBlob,
    previewBlob: equalizerPreviewBlob,
    selectedPreset,
    analysisResult,
    error: equalizerError,
    applyPreset,
    analyzeAndSuggest,
    previewPreset,
    setPreset,
    reset: resetEqualizer,
  } = useEqualizer();

  const {
    isDetecting: isDetectingLoops,
    isCreating: isCreatingLoop,
    loopPoints,
    selectedLoopPoint,
    syncedBlob,
    error: loopSyncError,
    detectLoops,
    createSyncedLoop,
    selectLoopPoint,
    reset: resetLoopSync,
  } = useLoopSync();

  // Détecter le support navigateur
  const browserSupport = useMemo(() => getBrowserSupport(), []);
  
  // S'assurer que le mode sélectionné est supporté
  useEffect(() => {
    if (!isRecordingModeSupported(recordingMode)) {
      // Si le mode système n'est pas supporté, basculer vers microphone
      if (recordingMode === 'system') {
        setRecordingMode('microphone');
        toast.warning('Le mode son système n\'est pas disponible sur votre navigateur. Mode microphone activé.');
      }
    }
  }, [recordingMode]);

  const getBlobDuration = async (blob: Blob): Promise<number | null> => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Vérifier que la durée est valide
      const rawDuration = audioBuffer.duration;
      if (!Number.isFinite(rawDuration) || rawDuration <= 0 || rawDuration > 300) {
        // Durée invalide (NaN, Infinity, négative, ou > 5 minutes)
        console.warn('Durée audio invalide:', rawDuration);
        await audioContext.close();
        return null;
      }
      
      const seconds = Math.round(rawDuration);
      await audioContext.close();
      
      // S'assurer que la durée est dans une plage acceptable (1-40 secondes pour sonnerie)
      if (seconds < 1 || seconds > 40) {
        console.warn('Durée hors plage acceptable pour sonnerie:', seconds);
        // Retourner quand même la valeur, mais elle sera validée avant l'envoi
      }
      
      return seconds;
    } catch (durationError) {
      console.error('Impossible de calculer la durée audio:', durationError);
      return null;
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (recorderError) {
      toast.error(recorderError);
    }
  }, [recorderError]);

  useEffect(() => {
    if (smartError) {
      toast.error(smartError);
    }
  }, [smartError]);

  useEffect(() => {
    if (equalizerError) {
      toast.error(equalizerError);
    }
  }, [equalizerError]);

  useEffect(() => {
    if (loopSyncError) {
      toast.error(loopSyncError);
    }
  }, [loopSyncError]);

  useEffect(() => {
    if (bpmError) {
      toast.error(bpmError);
    }
  }, [bpmError]);

  // Mettre à jour les bornes de découpe quand la durée change
  useEffect(() => {
    if (duration > 0) {
      setTrimStart((prev) => Math.max(0, Math.min(prev, duration - 1)));
      setTrimEnd((prev) => {
        if (prev <= 0 || prev > duration) {
          return duration;
        }
        if (prev <= trimStart) {
          return Math.min(duration, trimStart + 1);
        }
        return prev;
      });
    } else {
      setTrimStart(0);
      setTrimEnd(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  // Limiter la lecture au segment actif pour la pré-écoute
  useEffect(() => {
    const audio = previewAudioRef.current;
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


  const handleStart = async () => {
    try {
      await startRecording();
      if (recordingMode === 'system') {
        toast.info('Sélectionnez l\'onglet ou l\'application avec le son à capturer');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Impossible de démarrer l\'enregistrement';
      toast.error(errorMessage);
    }
  };

  const handleStop = () => {
    stopRecording();
  };

  const handlePlaySegment = (segmentId: number) => {
    const audio = previewAudioRef.current;
    const segment = segments.find((s) => s.id === segmentId);

    if (!audio || !segment) {
      toast.error('Impossible de lire ce segment audio');
      return;
    }

    // Vérifier que les métadonnées audio sont disponibles
    const hasValidDuration =
      Number.isFinite(audio.duration) && typeof audio.duration === 'number' && audio.duration > 0;

    if (!hasValidDuration) {
      toast.info('Chargement de l’audio, réessayez dans un instant');
      return;
    }

    // Empêcher de positionner currentTime en dehors de la durée réelle
    const maxSafeStart = Math.max(0, audio.duration - 0.1);
    const safeStart = Math.max(0, Math.min(segment.startSeconds, maxSafeStart));

    try {
      setActiveSegmentId(segmentId);
      audio.currentTime = safeStart;
      // play() peut être rejeté sur certains navigateurs si pas déclenché par un geste utilisateur,
      // mais ici c'est appelé par un clic sur le bouton "Écouter".
      // On ajoute quand même un catch par sécurité.
      void audio.play().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Impossible de lire le segment:', error);
        toast.error('Impossible de lire ce segment audio');
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur de lecture du segment:', error);
      toast.error('Impossible de lire ce segment audio');
    }
  };

  const handleOptimize = async () => {
    const originalBlob = getAudioBlob();
    if (!originalBlob) {
      toast.error('Aucun enregistrement disponible pour optimisation');
      return;
    }

    setLastOriginalBlob(originalBlob);
    resetEqualizer(); // Réinitialiser l'égaliseur quand on optimise
    try {
      const options =
        useManualTrim && duration > 1
          ? {
              manualStartSeconds: Math.max(0, Math.min(trimStart, duration - 1)),
              manualEndSeconds: Math.max(
                Math.max(0, Math.min(trimStart + 1, duration)),
                Math.min(trimEnd, duration),
              ),
            }
          : undefined;

      await optimize(originalBlob, options);
      setUseOptimizedVersion(true);
      toast.success('Sonnerie optimisée ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook via smartError
    }
  };

  const handleAnalyzeSpectrum = async () => {
    const baseBlob = lastOriginalBlob ?? getAudioBlob();
    if (!baseBlob) {
      toast.error('Aucun enregistrement disponible pour analyse');
      return;
    }

    try {
      await analyzeAndSuggest(baseBlob);
      toast.success('Analyse spectrale terminée ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  };

  const handlePreviewEqualizer = async (preset: typeof selectedPreset) => {
    const baseBlob = lastOriginalBlob ?? getAudioBlob();
    if (!baseBlob) {
      toast.error('Aucun enregistrement disponible pour prévisualisation');
      return;
    }

    try {
      await previewPreset(baseBlob, preset);
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  };

  const handleApplyEqualizer = async () => {
    const baseBlob = lastOriginalBlob ?? getAudioBlob();
    if (!baseBlob) {
      toast.error('Aucun enregistrement disponible pour égalisation');
      return;
    }

    try {
      await applyPreset(baseBlob, selectedPreset);
      setUseOptimizedVersion(false); // Utiliser la version égalisée
      toast.success('Égalisation appliquée ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  };

  const handleDetectBPM = async () => {
    const baseBlob = lastOriginalBlob ?? getAudioBlob();

    if (!baseBlob) {
      toast.error('Aucun enregistrement disponible pour analyser le BPM');
      return;
    }

    try {
      await detectBPMFromBlob(baseBlob, {
        minBPM: 60,
        maxBPM: 200,
      });
      // Réinitialiser la synchronisation rythmique quand on détecte un nouveau BPM
      resetLoopSync();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur lors de la détection du BPM';
      toast.error(message);
    }
  };

  const handleDetectLoops = async () => {
    if (!bpmResult) {
      toast.error('Détectez d\'abord le BPM avant de chercher les points de boucle');
      return;
    }

    const baseBlob = lastOriginalBlob ?? getAudioBlob();
    if (!baseBlob) {
      toast.error('Aucun enregistrement disponible');
      return;
    }

    try {
      await detectLoops(baseBlob, bpmResult.bpm, 4);
      toast.success('Points de boucle détectés ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  };

  const handleCreateSyncedLoop = async (beatsPerLoop: number) => {
    try {
      await createSyncedLoop(beatsPerLoop, 50);
      setUseOptimizedVersion(false); // Utiliser la version bouclée
      toast.success('Boucle synchronisée créée ✔️');
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }

    const extension = fileExtension || 'm4a';
    const safeMimeType = recordingMimeType || 'audio/mp4';
    const sanitizedTitle = title.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone';

    try {
      // Cas multi-parties : découpe automatique avec segments sélectionnés
      if (!useManualTrim && segments.length > 0 && selectedSegmentIds.length > 0) {
        const originalBlobForSegments = lastOriginalBlob ?? getAudioBlob();
        if (!originalBlobForSegments) {
          toast.error('Aucun enregistrement disponible pour créer les sonneries par partie');
          return;
        }

        const selectedSegments = segments.filter((segment) =>
          selectedSegmentIds.includes(segment.id),
        );

        if (selectedSegments.length === 0) {
          toast.error('Sélectionnez au moins une partie à garder');
          return;
        }

        const builtRingtones = await buildRingtonesForSegments(
          originalBlobForSegments,
          selectedSegments,
        );

        for (const built of builtRingtones) {
          let finalDuration = built.durationSeconds;

          if (!Number.isFinite(finalDuration) || finalDuration < 1) {
            // On ignore cette partie si la durée est invalide
            // et on passe à la suivante
            // eslint-disable-next-line no-continue
            continue;
          }

          if (finalDuration > 40) {
            finalDuration = 40;
          }

          finalDuration = Math.round(finalDuration);

          const partTitle = `${title} (partie ${built.segmentId})`;
          const filename = `${sanitizedTitle}_partie_${built.segmentId}.${extension}`;
          const file = new File([built.blob], filename, { type: safeMimeType });

          await upload(file, partTitle, extension, finalDuration);
        }

        toast.success('Sonneries par partie enregistrées ✔️');
        navigate('/dashboard');
        return;
      }

      // Cas standard : une seule sonnerie (originale, optimisée, égalisée ou bouclée, avec ou sans découpe manuelle)
      const baseBlob =
        useOptimizedVersion && syncedBlob
          ? syncedBlob
          : useOptimizedVersion && equalizedBlob
            ? equalizedBlob
            : useOptimizedVersion && optimizedBlob
              ? optimizedBlob
              : getAudioBlob();

      if (!baseBlob) {
        toast.error('Aucun enregistrement disponible');
        return;
      }

      const filename = `${sanitizedTitle}.${extension}`;
      const file = new File([baseBlob], filename, { type: safeMimeType });

      // Calculer la durée réelle du fichier audio pour éviter les valeurs 0
      const preciseDuration = await getBlobDuration(baseBlob);
      let finalDuration = preciseDuration ?? duration;

      // Validation stricte de la durée avant l'envoi
      // Les sonneries doivent avoir une durée entre 1 et 40 secondes
      if (!Number.isFinite(finalDuration) || finalDuration < 1) {
        toast.error('Durée d\'enregistrement invalide. L\'enregistrement doit durer au moins 1 seconde.');
        return;
      }

      if (finalDuration > 40) {
        toast.warning(`Durée de ${finalDuration}s supérieure à 40s. La durée sera limitée à 40s.`);
        finalDuration = 40;
      }

      // S'assurer que la durée est un entier
      finalDuration = Math.round(finalDuration);

      await upload(file, title, extension, finalDuration);
      toast.success('Sonnerie enregistrée ✔️');
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'upload';
      toast.error(errorMessage);
      console.error('Upload error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/dashboard')} variant="secondary" className="mb-6">
          ← Retour
        </Button>

        <Card>
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            Enregistrer une sonnerie
          </h1>

          <div className="space-y-6">
            <Input
              label="Titre de la sonnerie"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ma sonnerie personnalisée"
              disabled={isRecording}
            />

            {/* Sélecteur de mode d'enregistrement */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mode d'enregistrement
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRecordingMode('microphone')}
                  disabled={isRecording}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors min-h-[44px] ${
                    recordingMode === 'microphone'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  } ${isRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  🎤 Microphone
                </button>
                <button
                  type="button"
                  onClick={() => setRecordingMode('system')}
                  disabled={isRecording || !browserSupport.systemAudio}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors min-h-[44px] ${
                    recordingMode === 'system'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  } ${isRecording || !browserSupport.systemAudio ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={!browserSupport.systemAudio ? 'Non disponible sur votre navigateur' : undefined}
                >
                  🔊 Son système
                  {!browserSupport.systemAudio && (
                    <span className="ml-1 text-xs">⚠️</span>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {recordingMode === 'system' 
                  ? getSystemAudioHelpMessage()
                  : '💡 Enregistre depuis votre microphone'}
              </p>
              {browserSupport.isMobile && recordingMode === 'system' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Sur mobile, la capture audio système peut être limitée. Utilisez le mode microphone pour de meilleurs résultats.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Volume d'enregistrement: {gain.toFixed(1)}x
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {gain === 1.0
                    ? 'Normal'
                    : gain < 2.0
                      ? 'Léger boost'
                      : gain < 3.0
                        ? 'Boost moyen'
                        : 'Boost fort'}
                </span>
              </label>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.1"
                value={gain}
                onChange={(e) => setGain(parseFloat(e.target.value))}
                disabled={isRecording}
                className="range-default"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>1.0x (Normal)</span>
                <span>2.0x (Recommandé)</span>
                <span>4.0x (Max)</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                💡 Augmente le volume d'enregistrement. Au-delà de 3.0x, risque de distorsion.
              </p>
            </div>

            {/* Assistant Smart Ringtone */}
            {!isRecording && duration > 0 && (
              <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white/60 dark:bg-gray-800/60">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Assistant Smart Ringtone
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Coupe les silences, normalise le volume et applique un fondu propre.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleOptimize}
                    isLoading={isOptimizing}
                    disabled={isOptimizing}
                  >
                    ✨ Optimiser
                  </Button>
                </div>

                {/* Mode découpe manuelle */}
                <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={useManualTrim}
                      onChange={(e) => setUseManualTrim(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Activer la découpe manuelle (début / fin de la sonnerie)</span>
                  </label>

                  {useManualTrim && duration > 1 && (
                    <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span>
                          Début :{' '}
                          <span className="font-mono">
                            {formatTime(Math.max(0, Math.min(trimStart, duration)))}
                          </span>
                        </span>
                        <span>
                          Fin :{' '}
                          <span className="font-mono">
                            {formatTime(Math.max(trimStart + 1, Math.min(trimEnd || duration, duration)))}
                          </span>
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-500 dark:text-gray-400">
                          Position de début
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(1, duration - 1)}
                          step={0.1}
                          value={trimStart}
                          onChange={(e) => {
                            const next = parseFloat(e.target.value);
                            setTrimStart(Math.min(next, Math.max(0, (trimEnd || duration) - 1)));
                          }}
                          className="range-default"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] text-gray-500 dark:text-gray-400">
                          Position de fin
                        </label>
                        <input
                          type="range"
                          min={Math.min(duration - 1, trimStart + 1)}
                          max={duration}
                          step={0.1}
                          value={trimEnd || duration}
                          onChange={(e) => {
                            const next = parseFloat(e.target.value);
                            setTrimEnd(Math.max(next, trimStart + 1));
                          }}
                          className="range-default"
                        />
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        La sonnerie finale utilisera uniquement la partie entre le début et la fin sélectionnés.
                      </p>
                    </div>
                  )}
                </div>

                {/* Paramètres de découpe automatique et segments détectés */}
                {!useManualTrim && duration > 0 && (
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Seuil de volume (dB)
                        <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">
                          {silenceThresholdDb.toFixed(0)} dB
                        </span>
                      </label>
                      <input
                        type="range"
                        min={-60}
                        max={-10}
                        step={1}
                        value={silenceThresholdDb}
                        onChange={(e) => setSilenceThresholdDb(parseInt(e.target.value, 10))}
                        className="range-default"
                      />
                      <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <span>-60 dB (très sensible)</span>
                        <span>-10 dB (peu sensible)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Durée minimale du blanc (ms)
                        <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">
                          {minSilenceDurationMs} ms
                        </span>
                      </label>
                      <input
                        type="range"
                        min={100}
                        max={1000}
                        step={50}
                        value={minSilenceDurationMs}
                        onChange={(e) => setMinSilenceDurationMs(parseInt(e.target.value, 10))}
                        className="range-default"
                      />
                      <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <span>100 ms (coupes fréquentes)</span>
                        <span>1000 ms (coupes plus rares)</span>
                      </div>
                    </div>

                    {segments.length > 0 && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Choisissez quelle(s) partie(s) vous voulez garder
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Par défaut, la première partie est sélectionnée. Vous pouvez en choisir
                            plusieurs, une sonnerie sera créée pour chaque partie.
                          </p>
                        </div>

                        {/* Timeline globale avec segments colorés */}
                        <div className="w-full h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
                          {segments.map((segment, index) => {
                            const total = duration || segment.endSeconds;
                            const widthPercent =
                              total > 0 ? (segment.durationSeconds / total) * 100 : 0;
                            const isSelected = selectedSegmentIds.includes(segment.id);
                            const colors = [
                              'bg-blue-500',
                              'bg-green-500',
                              'bg-purple-500',
                              'bg-amber-500',
                              'bg-rose-500',
                            ];
                            const colorClass = colors[index % colors.length];
                            return (
                              <div
                                key={segment.id}
                                className={`relative h-full ${colorClass} ${
                                  isSelected ? '' : 'opacity-40'
                                }`}
                                style={{ width: `${Math.max(widthPercent, 2)}%` }}
                              >
                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-800 dark:text-gray-100">
                                  {segment.id}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Liste des segments avec cases à cocher et pré-écoute */}
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {segments.map((segment) => {
                            const startSec = Math.max(0, Math.floor(segment.startSeconds));
                            const endSec = Math.max(
                              startSec + 1,
                              Math.floor(segment.endSeconds),
                            );
                            const format = (sec: number) => {
                              const mins = Math.floor(sec / 60);
                              const secs = sec % 60;
                              return `${mins.toString().padStart(2, '0')}:${secs
                                .toString()
                                .padStart(2, '0')}`;
                            };
                            const isSelected = selectedSegmentIds.includes(segment.id);
                            return (
                              <label
                                key={segment.id}
                                className="flex items-center justify-between gap-2 text-[11px] px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/80 cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSegmentSelection(segment.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="font-medium">
                                    Partie {segment.id}{' '}
                                    <span className="font-normal text-gray-500 dark:text-gray-400">
                                      ({format(startSec)} → {format(endSec)})
                                    </span>
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handlePlaySegment(segment.id)}
                                  disabled={
                                    isOptimizing ||
                                    (!lastOriginalBlob && !optimizedBlob && !equalizedBlob && !syncedBlob)
                                  }
                                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 min-h-[28px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isOptimizing ? (
                                    <>
                                      <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                      <span>Préparation…</span>
                                    </>
                                  ) : (
                                    'Écouter'
                                  )}
                                </button>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Section Égaliseur Audio */}
                {!isRecording && duration > 0 && (
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                    <Equalizer
                      selectedPreset={selectedPreset}
                      onPresetChange={setPreset}
                      onAnalyze={handleAnalyzeSpectrum}
                      onApply={handleApplyEqualizer}
                      onPreview={handlePreviewEqualizer}
                      isAnalyzing={isAnalyzingSpectrum}
                      isProcessing={isEqualizing}
                      isPreviewing={isPreviewingEqualizer}
                      previewBlob={equalizerPreviewBlob}
                      analysisResult={analysisResult}
                    />
                  </div>
                )}

                {/* Section BPM & synchronisation rythmique (prévisualisation) */}
                <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        Détection BPM (expérimental)
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Analyse le tempo pour préparer des boucles de sonneries parfaitement synchronisées.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleDetectBPM}
                      isLoading={isDetectingBPM}
                      disabled={isDetectingBPM}
                    >
                      🎵 Détecter le BPM
                    </Button>
                  </div>

                  {bpmResult && (
                    <>
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            BPM détecté :{' '}
                            <span className="font-mono">
                              {Math.round(bpmResult.bpm)}
                            </span>
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Confiance : {(bpmResult.confidence * 100).toFixed(0)}% · Méthode :{' '}
                            {bpmResult.method === 'autocorrelation' ? 'Autocorrélation' : 'Énergie'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={resetBPM}
                          className="text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 min-h-[28px]"
                        >
                          Réinitialiser
                        </button>
                      </div>

                      {/* Synchronisation Rythmique */}
                      <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                              Synchronisation Rythmique
                            </h4>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Créez une sonnerie qui boucle parfaitement sans coupure
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleDetectLoops}
                            isLoading={isDetectingLoops}
                            disabled={isDetectingLoops}
                            className="text-xs min-h-[32px]"
                          >
                            🔄 Détecter les boucles
                          </Button>
                        </div>

                        {loopPoints.length > 0 && (
                          <LoopPointEditor
                            loopPoints={loopPoints}
                            selectedLoopPoint={selectedLoopPoint}
                            onSelectLoopPoint={selectLoopPoint}
                            onCreateLoop={handleCreateSyncedLoop}
                            isCreating={isCreatingLoop}
                            bpm={bpmResult.bpm}
                          />
                        )}

                        {loopPoints.length === 0 && !isDetectingLoops && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Cliquez sur "🔄 Détecter les boucles" pour trouver les meilleurs points de boucle
                            synchronisés sur le tempo.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {(lastOriginalBlob || optimizedBlob || equalizedBlob || syncedBlob) && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Prévisualisation
                      </span>
                      <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 p-1">
                        <button
                          type="button"
                          onClick={() => setUseOptimizedVersion(false)}
                          className={`px-3 py-1 text-xs rounded-full ${
                            !useOptimizedVersion
                              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow'
                              : 'text-gray-500 dark:text-gray-300'
                          }`}
                        >
                          Original
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!optimizedBlob && !equalizedBlob && !syncedBlob) {
                              toast.info('Clique sur ✨ Optimiser, appliquez un égaliseur ou créez une boucle');
                              return;
                            }
                            setUseOptimizedVersion(true);
                          }}
                          className={`px-3 py-1 text-xs rounded-full ${
                            useOptimizedVersion
                              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow'
                              : 'text-gray-500 dark:text-gray-300'
                          }`}
                        >
                          {syncedBlob ? 'Bouclée' : equalizedBlob ? 'Égalisée' : 'Optimisée'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <audio
                        ref={previewAudioRef}
                        controls
                        className="w-full"
                        src={
                          useOptimizedVersion
                            ? syncedBlob
                              ? URL.createObjectURL(syncedBlob)
                              : equalizedBlob
                                ? URL.createObjectURL(equalizedBlob)
                                : optimizedBlob
                                  ? URL.createObjectURL(optimizedBlob)
                                  : undefined
                            : lastOriginalBlob
                              ? URL.createObjectURL(lastOriginalBlob)
                              : undefined
                        }
                      />
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {useOptimizedVersion
                          ? syncedBlob
                            ? 'Lecture de la version bouclée synchronisée (boucle parfaite).'
                            : equalizedBlob
                              ? `Lecture de la version égalisée (preset: ${selectedPreset}).`
                              : optimizedBlob
                                ? 'Lecture de la version optimisée (WAV normalisée avec fade).'
                                : 'Aucune version traitée disponible.'
                          : 'Lecture de la version originale brute.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="text-center py-8">
              <div className="text-6xl font-mono mb-4 text-gray-900 dark:text-gray-100">
                {formatTime(duration)}
              </div>
              <div className="flex justify-center gap-4">
                {!isRecording ? (
                  <Button onClick={handleStart} variant="primary" className="text-lg px-6 py-3">
                    {recordingMode === 'system' ? '🔊' : '🎤'} Démarrer l'enregistrement
                  </Button>
                ) : (
                  <>
                    {isPaused ? (
                      <Button onClick={resumeRecording} variant="primary">
                        ▶️ Reprendre
                      </Button>
                    ) : (
                      <Button onClick={pauseRecording} variant="secondary">
                        ⏸️ Pause
                      </Button>
                    )}
                    <Button onClick={handleStop} variant="danger">
                        ⏹️ Arrêter
                      </Button>
                  </>
                )}
              </div>
            </div>

            {!isRecording && duration > 0 && (
              <div className="flex gap-4">
                <Button
                  onClick={handleSave}
                  isLoading={isUploading}
                  variant="primary"
                  className="flex-1"
                >
                  💾 Enregistrer
                </Button>
                <Button
                  onClick={() => {
                    setTitle('');
                    navigate('/dashboard');
                  }}
                  variant="secondary"
                >
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};