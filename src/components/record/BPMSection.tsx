import { Button } from '../ui/Button';
import { LoopPointEditor } from '../../components/audio/LoopPointEditor';
import type { BPMDetectionResult } from '../../types/bpm.types';
import type { LoopPoint } from '../../types/rhythm.types';

interface BPMSectionProps {
  isDetectingBPM: boolean;
  bpmResult: BPMDetectionResult | null;
  isDetectingLoops: boolean;
  loopPoints: LoopPoint[];
  selectedLoopPoint: LoopPoint | null;
  isCreatingLoop: boolean;
  onDetectBPM: () => Promise<void>;
  onResetBPM: () => void;
  onDetectLoops: () => Promise<void>;
  onSelectLoopPoint: (loopPoint: LoopPoint) => void;
  onCreateLoop: (beatsPerLoop: number) => Promise<void>;
}

export const BPMSection = ({
  isDetectingBPM,
  bpmResult,
  isDetectingLoops,
  loopPoints,
  selectedLoopPoint,
  isCreatingLoop,
  onDetectBPM,
  onResetBPM,
  onDetectLoops,
  onSelectLoopPoint,
  onCreateLoop,
}: BPMSectionProps) => {
  return (
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
          onClick={onDetectBPM}
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
                BPM détecté : <span className="font-mono">{Math.round(bpmResult.bpm)}</span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Confiance : {(bpmResult.confidence * 100).toFixed(0)}% · Méthode :{' '}
                {bpmResult.method === 'autocorrelation' ? 'Autocorrélation' : 'Énergie'}
              </p>
            </div>
            <button
              type="button"
              onClick={onResetBPM}
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
                onClick={onDetectLoops}
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
                onSelectLoopPoint={onSelectLoopPoint}
                onCreateLoop={onCreateLoop}
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
  );
};

