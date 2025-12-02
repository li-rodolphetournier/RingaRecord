import { useEffect, useRef } from 'react';
import type { EqualizerPreset } from '../../types/equalizer.types';
import { EQUALIZER_PRESETS } from '../../services/audio/equalizer.service';
import { Button } from '../ui/Button';

interface EqualizerProps {
  selectedPreset: EqualizerPreset;
  onPresetChange: (preset: EqualizerPreset) => void;
  onAnalyze: () => void;
  onApply: () => void;
  isAnalyzing: boolean;
  isProcessing: boolean;
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
  isAnalyzing,
  isProcessing,
  analysisResult,
}: EqualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dessiner la courbe de réponse fréquentielle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);

    // Fond
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);

    // Grille
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;

    // Lignes horizontales (gain)
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Ligne zéro (gain 0 dB)
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    const zeroY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();

    // Dessiner la courbe du preset sélectionné
    if (selectedPreset !== 'none') {
      const preset = EQUALIZER_PRESETS[selectedPreset];
      if (preset.bands.length > 0) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Échelle logarithmique pour les fréquences (20 Hz à 20 kHz)
        const logMin = Math.log10(20);
        const logMax = Math.log10(20000);

        for (let x = 0; x < width; x++) {
          const freqRatio = x / width;
          const freq = Math.pow(10, logMin + freqRatio * (logMax - logMin));

          // Calculer le gain total à cette fréquence
          let totalGain = 0;
          for (const band of preset.bands) {
            const q = band.q;
            const centerFreq = band.frequency;
            const gain = band.gain;

            // Réponse d'un filtre peaking (approximation)
            const bandwidth = centerFreq / q;
            const distance = Math.abs(freq - centerFreq);

            if (distance < bandwidth * 2) {
              const influence = 1 - distance / (bandwidth * 2);
              totalGain += gain * influence;
            }
          }

          // Limiter le gain
          totalGain = Math.max(-20, Math.min(20, totalGain));

          // Convertir gain (dB) en position Y
          const gainRange = 20; // -20 à +20 dB
          const y = zeroY - (totalGain / gainRange) * (height / 2);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }
    }

    // Labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('20 Hz', width * 0.1, height - 5);
    ctx.fillText('1 kHz', width * 0.5, height - 5);
    ctx.fillText('20 kHz', width * 0.9, height - 5);

    ctx.textAlign = 'left';
    ctx.fillText('+20 dB', 5, 15);
    ctx.fillText('0 dB', 5, zeroY + 5);
    ctx.fillText('-20 dB', 5, height - 5);
  }, [selectedPreset]);

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

      {/* Bouton d'application */}
      <Button
        type="button"
        variant="primary"
        onClick={onApply}
        isLoading={isProcessing}
        disabled={isProcessing || selectedPreset === 'none'}
        className="w-full min-h-[44px]"
      >
        ✨ Appliquer l'égalisation
      </Button>
    </div>
  );
};

