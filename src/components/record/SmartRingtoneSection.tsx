import { Button } from '../ui/Button';
import { ManualTrimSection } from './ManualTrimSection';
import type { SmartRingtoneSegment } from '../../services/audio/smartRingtone.service';

interface SmartRingtoneSectionProps {
  duration: number;
  isOptimizing: boolean;
  useManualTrim: boolean;
  trimStart: number;
  trimEnd: number;
  silenceThresholdDb: number;
  minSilenceDurationMs: number;
  segments: SmartRingtoneSegment[];
  activeSegmentId: number | null;
  isSegmentPlaying: boolean;
  onOptimize: () => Promise<void>;
  onToggleManualTrim: (enabled: boolean) => void;
  onTrimStartChange: (value: number) => void;
  onTrimEndChange: (value: number) => void;
  onSilenceThresholdChange: (value: number) => void;
  onMinSilenceDurationChange: (value: number) => void;
  onPlaySegment: (segmentId: number) => void;
}

export const SmartRingtoneSection = ({
  duration,
  isOptimizing,
  useManualTrim,
  trimStart,
  trimEnd,
  silenceThresholdDb,
  minSilenceDurationMs,
  segments,
  activeSegmentId,
  isSegmentPlaying,
  onOptimize,
  onToggleManualTrim,
  onTrimStartChange,
  onTrimEndChange,
  onSilenceThresholdChange,
  onMinSilenceDurationChange,
  onPlaySegment,
}: SmartRingtoneSectionProps) => {
  if (duration <= 0) {
    return null;
  }

  return (
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
          onClick={onOptimize}
          isLoading={isOptimizing}
          disabled={isOptimizing}
        >
          ✨ Optimiser
        </Button>
      </div>

      <ManualTrimSection
        useManualTrim={useManualTrim}
        duration={duration}
        trimStart={trimStart}
        trimEnd={trimEnd}
        onToggleManualTrim={onToggleManualTrim}
        onTrimStartChange={onTrimStartChange}
        onTrimEndChange={onTrimEndChange}
      />

      {/* Paramètres de découpe automatique et segments détectés */}
      {!useManualTrim && (
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
              onChange={(e) => onSilenceThresholdChange(parseInt(e.target.value, 10))}
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
              min={50}
              max={500}
              step={10}
              value={minSilenceDurationMs}
              onChange={(e) => onMinSilenceDurationChange(parseInt(e.target.value, 10))}
              className="range-default"
            />
            <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>50 ms (coupures courtes)</span>
              <span>500 ms (coupures longues)</span>
            </div>
          </div>

          {segments.length > 0 && (
            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {segments.length} segment{segments.length > 1 ? 's' : ''} détecté
                {segments.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {segments.map((segment) => {
                  const isActive = activeSegmentId === segment.id;
                  const isPlaying = isActive && isSegmentPlaying;
                  
                  return (
                    <button
                      key={segment.id}
                      type="button"
                      onClick={() => onPlaySegment(segment.id)}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] transition-colors flex items-center gap-2 ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {isPlaying ? (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1">
                        Segment {segment.id}: {segment.startSeconds.toFixed(1)}s -{' '}
                        {segment.endSeconds.toFixed(1)}s
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

