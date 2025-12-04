import { useEffect, useRef } from 'react';
import type { EqualizerPreset } from '../types/equalizer.types';
import { EQUALIZER_PRESETS } from '../services/audio/equalizer.service';

/**
 * Hook pour gérer le dessin de la courbe de réponse fréquentielle sur canvas
 * @param selectedPreset - Le preset d'égalisation sélectionné
 * @returns Référence au canvas
 */
export const useEqualizerCanvas = (selectedPreset: EqualizerPreset) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  return canvasRef;
};

