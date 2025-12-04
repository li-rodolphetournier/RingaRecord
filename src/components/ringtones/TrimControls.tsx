import type { Ringtone } from '../../types/ringtone.types';
import { Button } from '../ui/Button';

interface TrimControlsProps {
  ringtone: Ringtone;
  trimStart: number;
  trimEnd: number;
  onTrimStartChange: (value: number) => void;
  onTrimEndChange: (value: number) => void;
  onOptimize: () => void;
  isOptimizing: boolean;
}

/**
 * Composant pour les contrôles de découpe manuelle d'une sonnerie.
 * Permet de définir le début et la fin de la découpe avec des sliders.
 */
export const TrimControls = ({
  ringtone,
  trimStart,
  trimEnd,
  onTrimStartChange,
  onTrimEndChange,
  onOptimize,
  isOptimizing,
}: TrimControlsProps) => {
  const duration = ringtone.duration;
  if (duration <= 1) {
    return null;
  }

  const safeTrimStart = Math.max(0, Math.min(trimStart, duration - 1));
  const safeTrimEnd = Math.max(
    Math.min(trimStart + 1, duration),
    Math.min(trimEnd || duration, duration),
  );

  return (
    <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white/60 dark:bg-gray-800/60">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
          <span className="font-medium">Découpe manuelle</span>
          <span className="font-mono">
            {safeTrimStart.toFixed(1)}s → {safeTrimEnd.toFixed(1)}s
          </span>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] text-gray-500 dark:text-gray-400">Début</label>
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
            className="range-default w-full"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] text-gray-500 dark:text-gray-400">Fin</label>
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
            className="range-default w-full"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onOptimize}
            variant="secondary"
            className="min-h-[36px]"
            isLoading={isOptimizing}
            disabled={isOptimizing}
          >
            ✨ Créer une version optimisée découpée
          </Button>
        </div>
      </div>
    </div>
  );
};
