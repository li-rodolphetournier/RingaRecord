import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export const Record = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { upload, isLoading: isUploading } = useRingtoneStore();
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
  } = useAudioRecorder();

  const [title, setTitle] = useState('');

  const getBlobDuration = async (blob: Blob): Promise<number | null> => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const seconds = Math.round(audioBuffer.duration);
      await audioContext.close();
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

  const handleStart = async () => {
    try {
      await startRecording();
    } catch {
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const handleStop = () => {
    stopRecording();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }

    const audioBlob = getAudioBlob();
    if (!audioBlob) {
      toast.error('Aucun enregistrement disponible');
      return;
    }

    try {
      // Créer un fichier à partir du blob
      const extension = fileExtension || 'm4a';
      const safeMimeType = recordingMimeType || 'audio/mp4';
      const sanitizedTitle = title.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone';
      const filename = `${sanitizedTitle}.${extension}`;
      const file = new File([audioBlob], filename, { type: safeMimeType });

      // Calculer la durée réelle du fichier audio pour éviter les valeurs 0
      const preciseDuration = await getBlobDuration(audioBlob);
      const finalDuration = preciseDuration ?? duration;

      await upload(file, title, extension, Math.max(1, finalDuration));
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

            <div className="text-center py-8">
              <div className="text-6xl font-mono mb-4 text-gray-900 dark:text-gray-100">
                {formatTime(duration)}
              </div>
              <div className="flex justify-center gap-4">
                {!isRecording ? (
                  <Button onClick={handleStart} variant="primary" className="text-lg px-6 py-3">
                    🎤 Démarrer l'enregistrement
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

