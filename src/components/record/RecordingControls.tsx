import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { RecordingMode } from '../../utils/browserSupport';
import { getSystemAudioHelpMessage } from '../../utils/browserSupport';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  title: string;
  gain: number;
  maxDuration: number;
  recordingMode: RecordingMode;
  onTitleChange: (title: string) => void;
  onGainChange: (gain: number) => void;
  onMaxDurationChange: (maxDuration: number) => void;
  onRecordingModeChange: (mode: RecordingMode) => void;
  onStart: () => Promise<void>;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

export const RecordingControls = ({
  isRecording,
  isPaused,
  duration,
  title,
  gain,
  maxDuration,
  recordingMode,
  onTitleChange,
  onGainChange,
  onMaxDurationChange,
  onRecordingModeChange,
  onStart,
  onStop,
  onPause,
  onResume,
}: RecordingControlsProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Titre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Titre de la sonnerie
        </label>
        <Input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ma sonnerie"
          disabled={isRecording}
          className="w-full"
        />
      </div>

      {/* Mode d'enregistrement */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Source audio
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRecordingModeChange('microphone')}
            disabled={isRecording}
            className={`flex-1 px-4 py-2 rounded-lg border transition-colors min-h-[44px] ${
              recordingMode === 'microphone'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            🎤 Microphone
          </button>
          <button
            type="button"
            onClick={() => onRecordingModeChange('system')}
            disabled={isRecording}
            className={`flex-1 px-4 py-2 rounded-lg border transition-colors min-h-[44px] ${
              recordingMode === 'system'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            🔊 Son système
          </button>
        </div>
        {recordingMode === 'system' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {getSystemAudioHelpMessage()}
          </p>
        )}
      </div>

      {/* Contrôles d'enregistrement */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
            {formatTime(duration)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isRecording ? (isPaused ? 'En pause' : 'Enregistrement...') : 'Prêt'}
          </div>
        </div>
        <div className="flex gap-2">
          {!isRecording ? (
            <Button type="button" onClick={onStart} variant="primary" className="min-h-[44px]">
              🎙️ Démarrer
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button type="button" onClick={onResume} variant="primary" className="min-h-[44px]">
                  ▶️ Reprendre
                </Button>
              ) : (
                <Button type="button" onClick={onPause} variant="secondary" className="min-h-[44px]">
                  ⏸️ Pause
                </Button>
              )}
              <Button type="button" onClick={onStop} variant="danger" className="min-h-[44px]">
                ⏹️ Arrêter
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Contrôle du gain */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <span>Gain d'enregistrement</span>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {gain.toFixed(1)}x{' '}
            {gain < 1.5
              ? '(Faible)'
              : gain < 2.5
                ? '(Recommandé)'
                : gain < 3.0
                  ? '(Boost moyen)'
                  : '(Boost fort)'}
          </span>
        </label>
        <input
          type="range"
          min="1.0"
          max="4.0"
          step="0.1"
          value={gain}
          onChange={(e) => onGainChange(parseFloat(e.target.value))}
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

      {/* Contrôle de la durée maximum */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <span>Durée maximum d'enregistrement</span>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {maxDuration}s{' '}
            {maxDuration <= 20
              ? '(Court)'
              : maxDuration <= 40
                ? '(Recommandé)'
                : maxDuration <= 60
                  ? '(Long)'
                  : '(Très long)'}
          </span>
        </label>
        <input
          type="range"
          min="5"
          max="120"
          step="5"
          value={maxDuration}
          onChange={(e) => onMaxDurationChange(parseInt(e.target.value, 10))}
          disabled={isRecording}
          className="range-default"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>5s</span>
          <span>40s (Recommandé)</span>
          <span>120s</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          ⏱️ Durée maximum pour l'enregistrement et l'optimisation. Les sonneries sont généralement entre 5 et 40 secondes.
        </p>
      </div>
    </div>
  );
};

