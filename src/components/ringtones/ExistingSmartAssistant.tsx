import type { Ringtone } from '../../types/ringtone.types';
import { Button } from '../ui/Button';
import type { SmartRingtoneSegment } from '../../services/audio/smartRingtone.service';
import { formatTime } from '../../utils/formatUtils';

interface ExistingSmartAssistantProps {
  ringtone: Ringtone;
  isAnalyzing: boolean;
  segments: SmartRingtoneSegment[];
  selectedSegmentIds: number[];
  silenceThresholdDb: number;
  minSilenceDurationMs: number;
  smartSourceBlob: Blob | null;
  isPreparingSegment: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onAnalyze: () => void;
  onSilenceThresholdChange: (value: number) => void;
  onMinSilenceDurationChange: (value: number) => void;
  onToggleSegmentSelection: (segmentId: number) => void;
  onPlaySegment: (segmentId: number) => void;
  onCreateSegmentVersions: () => void;
}

/**
 * Composant pour l'Assistant Smart Ringtone multi-parties pour les sonneries existantes.
 * Permet d'analyser une sonnerie, détecter les segments, et créer des versions par partie.
 */
export const ExistingSmartAssistant = ({
  ringtone,
  isAnalyzing,
  segments,
  selectedSegmentIds,
  silenceThresholdDb,
  minSilenceDurationMs,
  smartSourceBlob,
  isPreparingSegment,
  audioRef,
  onAnalyze,
  onSilenceThresholdChange,
  onMinSilenceDurationChange,
  onToggleSegmentSelection,
  onPlaySegment,
  onCreateSegmentVersions,
}: ExistingSmartAssistantProps) => {

  return (
    <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
      <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
        <div>
          <p className="font-medium">Assistant Smart Ringtone (multi-parties)</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Détecte automatiquement les silences et permet de garder plusieurs parties distinctes.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-[32px] text-[11px] px-3"
          onClick={onAnalyze}
          isLoading={isAnalyzing}
          disabled={isAnalyzing}
        >
          Analyser
        </Button>
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
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
          onChange={(e) => onSilenceThresholdChange(parseInt(e.target.value, 10))}
          className="range-default w-full"
        />
        <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span>-60 dB (très sensible)</span>
          <span>-10 dB (peu sensible)</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
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
          onChange={(e) => onMinSilenceDurationChange(parseInt(e.target.value, 10))}
          className="range-default w-full"
        />
        <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span>100 ms (coupes fréquentes)</span>
          <span>1000 ms (coupes plus rares)</span>
        </div>
      </div>

      {segments.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
              Choisissez quelle(s) partie(s) vous voulez garder
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Une nouvelle sonnerie sera créée pour chaque partie sélectionnée.
            </p>
          </div>

          {/* Timeline globale */}
          <div className="w-full h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
            {segments.map((segment, index) => {
              const total = ringtone.duration || segment.endSeconds;
              const widthPercent = total > 0 ? (segment.durationSeconds / total) * 100 : 0;
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
                  className={`relative h-full ${colorClass} ${isSelected ? '' : 'opacity-40'}`}
                  style={{ width: `${Math.max(widthPercent, 2)}%` }}
                >
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-800 dark:text-gray-100">
                    {segment.id}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Liste des segments + pré-écoute */}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {segments.map((segment) => {
              const startSec = Math.max(0, Math.floor(segment.startSeconds));
              const endSec = Math.max(startSec + 1, Math.floor(segment.endSeconds));
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
                      onChange={() => onToggleSegmentSelection(segment.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">
                      Partie {segment.id}{' '}
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        ({formatTime(startSec)} → {formatTime(endSec)})
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlaySegment(segment.id)}
                    disabled={isPreparingSegment}
                    className="text-[11px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 min-h-[28px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPreparingSegment ? 'Préparation…' : 'Écouter'}
                  </button>
                </label>
              );
            })}
          </div>

          {/* Prévisualisation générale pour les segments */}
          {smartSourceBlob && (
            <div className="space-y-2">
              <audio
                ref={audioRef}
                controls
                className="w-full"
                src={URL.createObjectURL(smartSourceBlob)}
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Pré-écoute des différentes parties détectées.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              className="min-h-[32px] text-[11px] px-3"
              onClick={onCreateSegmentVersions}
            >
              💾 Créer une sonnerie par partie sélectionnée
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
