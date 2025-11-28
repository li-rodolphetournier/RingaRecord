import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getAudioBlob,
    error: recorderError,
  } = useAudioRecorder();

  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const handleStart = async () => {
    setError(null);
    try {
      await startRecording();
    } catch (err) {
      setError('Impossible d\'accéder au microphone');
    }
  };

  const handleStop = () => {
    stopRecording();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Veuillez entrer un titre');
      return;
    }

    const audioBlob = getAudioBlob();
    if (!audioBlob) {
      setError('Aucun enregistrement disponible');
      return;
    }

    try {
      // Créer un fichier à partir du blob
      const file = new File([audioBlob], `${title}.webm`, { type: 'audio/webm' });
      
      await upload(file, title, 'webm', duration);
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'upload';
      setError(errorMessage);
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

          {(error || recorderError) && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
              {error || recorderError}
            </div>
          )}

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

