import { useEffect, useRef, useState } from 'react';
import type { EqualizerPreset } from '../../types/equalizer.types';
import { EQUALIZER_PRESETS } from '../../services/audio/equalizer.service';
import { Button } from '../ui/Button';
import { useEqualizerCanvas } from '../../hooks/useEqualizerCanvas';

interface EqualizerProps {
  selectedPreset: EqualizerPreset;
  onPresetChange: (preset: EqualizerPreset) => void;
  onAnalyze: () => void;
  onApply: () => void;
  onPreview?: (preset: EqualizerPreset) => void;
  isAnalyzing: boolean;
  isProcessing: boolean;
  isPreviewing?: boolean;
  previewBlob?: Blob | null;
  analysisResult: {
    suggestedPreset: EqualizerPreset;
    confidence: number;
    bassEnergy: number;
    midEnergy: number;
    trebleEnergy: number;
  } | null;
}

export const Equalizer = ({
  selectedPreset,
  onPresetChange,
  onAnalyze,
  onApply,
  onPreview,
  isAnalyzing,
  isProcessing,
  isPreviewing = false,
  previewBlob = null,
  analysisResult,
}: EqualizerProps) => {
  const canvasRef = useEqualizerCanvas(selectedPreset);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Gérer l'URL de prévisualisation
  useEffect(() => {
    if (previewBlob) {
      const url = URL.createObjectURL(previewBlob);
      // Utiliser un callback pour éviter le warning setState dans effect
      requestAnimationFrame(() => {
        setPreviewUrl(url);
      });
      return () => {
        URL.revokeObjectURL(url);
        requestAnimationFrame(() => {
          setPreviewUrl(null);
        });
      };
    } else {
      requestAnimationFrame(() => {
        setPreviewUrl(null);
      });
    }
  }, [previewBlob]);

  // Arrêter la prévisualisation quand le preset change
  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
  }, [selectedPreset]);

  const handlePreview = () => {
    if (onPreview && selectedPreset !== 'none') {
      onPreview(selectedPreset);
    }
  };

  const handleStopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Égaliseur Audio</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Améliorez la qualité audio avec des presets d'égalisation
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onAnalyze}
          isLoading={isAnalyzing}
          disabled={isAnalyzing}
          className="text-xs min-h-[32px]"
        >
          🔍 Analyser
        </Button>
      </div>

      {/* Résultat de l'analyse */}
      {analysisResult && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
            Suggestion : {EQUALIZER_PRESETS[analysisResult.suggestedPreset].name}
          </p>
          <p className="text-[11px] text-blue-700 dark:text-blue-300">
            Confiance : {(analysisResult.confidence * 100).toFixed(0)}% · Basses:{' '}
            {(analysisResult.bassEnergy * 100).toFixed(0)}% · Médiums:{' '}
            {(analysisResult.midEnergy * 100).toFixed(0)}% · Aigus:{' '}
            {(analysisResult.trebleEnergy * 100).toFixed(0)}%
          </p>
        </div>
      )}

      {/* Visualisation graphique */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full h-auto max-h-[150px]"
        />
      </div>

      {/* Sélection de preset */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Preset d'égalisation
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.values(EQUALIZER_PRESETS).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPresetChange(preset.id)}
              disabled={isProcessing}
              className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors min-h-[44px] ${
                selectedPreset === preset.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="font-semibold">{preset.name}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Prévisualisation audio */}
      {onPreview && previewUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Prévisualisation
            </p>
            <button
              type="button"
              onClick={handleStopPreview}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Arrêter
            </button>
          </div>
          <audio
            ref={previewAudioRef}
            src={previewUrl}
            controls
            className="w-full h-10"
            onEnded={handleStopPreview}
          />
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-2">
        {onPreview && selectedPreset !== 'none' && (
          <Button
            type="button"
            variant="secondary"
            onClick={handlePreview}
            isLoading={isPreviewing}
            disabled={isPreviewing || isProcessing}
            className="flex-1 min-h-[44px]"
          >
            🎵 Prévisualiser
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={onApply}
          isLoading={isProcessing}
          disabled={isProcessing || selectedPreset === 'none'}
          className="flex-1 min-h-[44px]"
        >
          ✨ Appliquer
        </Button>
      </div>
    </div>
  );
};

