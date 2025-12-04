import { Button } from '../ui/Button';
import { Equalizer } from '../audio/Equalizer';
import type { EqualizerPreset, SpectralAnalysisResult } from '../../types/equalizer.types';

interface EqualizerSectionProps {
  isOpen: boolean;
  selectedPreset: EqualizerPreset | null;
  isAnalyzing: boolean;
  isProcessing: boolean;
  isPreviewing: boolean;
  previewBlob: Blob | null;
  analysisResult: SpectralAnalysisResult | null;
  onOpen: () => void;
  onPresetChange: (preset: EqualizerPreset) => void;
  onAnalyze: () => void;
  onApply: () => void;
  onPreview: (preset: EqualizerPreset) => void;
}

/**
 * Composant pour la section Égaliseur Audio d'une sonnerie existante.
 * Permet d'analyser le spectre, appliquer des presets et prévisualiser.
 */
export const EqualizerSection = ({
  isOpen,
  selectedPreset,
  isAnalyzing,
  isProcessing,
  isPreviewing,
  previewBlob,
  analysisResult,
  onOpen,
  onPresetChange,
  onAnalyze,
  onApply,
  onPreview,
}: EqualizerSectionProps) => {
  if (!isOpen) {
    return (
      <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
        <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-medium">Égaliseur Audio</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Améliorez la qualité audio avec des presets d'égalisation (Bass Boost, Vocal Clarity,
              etc.)
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[32px] text-[11px] px-3"
            onClick={onOpen}
          >
            Ouvrir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
      {selectedPreset && (
        <Equalizer
          selectedPreset={selectedPreset}
          onPresetChange={onPresetChange}
          onAnalyze={onAnalyze}
          onApply={onApply}
          onPreview={onPreview}
          isAnalyzing={isAnalyzing}
          isProcessing={isProcessing}
          isPreviewing={isPreviewing}
          previewBlob={previewBlob}
          analysisResult={analysisResult}
        />
      )}
    </div>
  );
};
