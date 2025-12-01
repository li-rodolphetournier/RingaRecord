import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSmartRingtone } from '../hooks/useSmartRingtone';
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
  } = useSmartRingtone();

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

  const handleOptimize = async () => {
    const originalBlob = getAudioBlob();
    if (!originalBlob) {
      toast.error('Aucun enregistrement disponible pour optimisation');
      return;
    }

    setLastOriginalBlob(originalBlob);
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

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }

    const baseBlob =
      useOptimizedVersion && optimizedBlob
        ? optimizedBlob
        : getAudioBlob();

    if (!baseBlob) {
      toast.error('Aucun enregistrement disponible');
      return;
    }

    try {
      // Créer un fichier à partir du blob utilisé (original ou optimisé)
      const extension = fileExtension || 'm4a';
      const safeMimeType = recordingMimeType || 'audio/mp4';
      const sanitizedTitle = title.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone';
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
                  ({gain === 1.0 ? 'Normal' : gain < 2.0 ? 'Léger boost' : gain < 3.0 ? 'Boost moyen' : 'Boost fort'})
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
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
                          Début : <span className="font-mono">{formatTime(Math.max(0, Math.min(trimStart, duration)))}</span>
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
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
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
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                        />
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        La sonnerie finale utilisera uniquement la partie entre le début et la fin sélectionnés.
                      </p>
                    </div>
                  )}
                </div>

                {(lastOriginalBlob || optimizedBlob) && (
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
                            if (!optimizedBlob) {
                              toast.info('Clique sur ✨ Optimiser pour générer la version optimisée');
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
                          Optimisée
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <audio
                        controls
                        className="w-full"
                        src={
                          useOptimizedVersion && optimizedBlob
                            ? URL.createObjectURL(optimizedBlob)
                            : lastOriginalBlob
                              ? URL.createObjectURL(lastOriginalBlob)
                              : undefined
                        }
                      />
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {useOptimizedVersion && optimizedBlob
                          ? 'Lecture de la version optimisée (WAV normalisée avec fade).'
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
