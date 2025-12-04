interface ManualTrimSectionProps {
  useManualTrim: boolean;
  duration: number;
  trimStart: number;
  trimEnd: number;
  onToggleManualTrim: (enabled: boolean) => void;
  onTrimStartChange: (value: number) => void;
  onTrimEndChange: (value: number) => void;
}

export const ManualTrimSection = ({
  useManualTrim,
  duration,
  trimStart,
  trimEnd,
  onToggleManualTrim,
  onTrimStartChange,
  onTrimEndChange,
}: ManualTrimSectionProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (duration <= 1) {
    return null;
  }

  return (
    <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
      <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={useManualTrim}
          onChange={(e) => onToggleManualTrim(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span>Activer la découpe manuelle (début / fin de la sonnerie)</span>
      </label>

      {useManualTrim && (
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
                onTrimStartChange(Math.min(next, Math.max(0, (trimEnd || duration) - 1)));
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
                onTrimEndChange(Math.max(next, trimStart + 1));
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
  );
};

