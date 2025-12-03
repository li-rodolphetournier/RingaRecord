import type { LoopPoint } from '../../types/rhythm.types';
import { Button } from '../ui/Button';

interface LoopPointEditorProps {
  loopPoints: LoopPoint[];
  selectedLoopPoint: LoopPoint | null;
  onSelectLoopPoint: (point: LoopPoint) => void;
  onCreateLoop: (beatsPerLoop: number) => void;
  isCreating: boolean;
  bpm: number | null;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const LoopPointEditor = ({
  loopPoints,
  selectedLoopPoint,
  onSelectLoopPoint,
  onCreateLoop,
  isCreating,
  bpm,
}: LoopPointEditorProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Points de Boucle Détectés
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Sélectionnez un point de boucle pour créer une sonnerie qui boucle parfaitement
        </p>
      </div>

      {loopPoints.length === 0 ? (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Aucun point de boucle valide trouvé. Essayez avec un autre BPM ou une autre longueur.
          </p>
        </div>
      ) : (
        <>
          {/* Liste des points de boucle */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {loopPoints.map((point, index) => {
              const isSelected = selectedLoopPoint?.startSeconds === point.startSeconds;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelectLoopPoint(point)}
                  className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-colors min-h-[44px] ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {point.measureCount} mesure{point.measureCount > 1 ? 's' : ''} ({point.beatsCount} beat
                        {point.beatsCount > 1 ? 's' : ''})
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {formatTime(point.startSeconds)} → {formatTime(point.endSeconds)} · Qualité:{' '}
                        {(point.quality * 100).toFixed(0)}%
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-blue-600 dark:text-blue-400 text-lg">✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Options de création */}
          {selectedLoopPoint && (
            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de beats par boucle
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 8].map((beats) => (
                    <Button
                      key={beats}
                      type="button"
                      variant={selectedLoopPoint.beatsCount === beats ? 'primary' : 'secondary'}
                      onClick={() => onCreateLoop(beats)}
                      disabled={isCreating}
                      className="min-h-[44px] text-xs"
                    >
                      {beats} beat{beats > 1 ? 's' : ''}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                  Le point sélectionné utilise {selectedLoopPoint.beatsCount} beats. Vous pouvez créer une boucle
                  avec un nombre différent de beats.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

