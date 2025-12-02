/**
 * Service d'analyse spectrale pour suggérer un preset d'égalisation
 */

import type { EqualizerPreset, SpectralAnalysisResult } from '../../types/equalizer.types';

/**
 * Analyse le spectre audio et suggère un preset d'égalisation
 */
export async function analyzeSpectrum(audioBuffer: AudioBuffer): Promise<SpectralAnalysisResult> {
  const AudioContextClass =
    window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Web Audio API non supportée');
  }

  const audioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048; // Taille de la FFT pour analyse

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Float32Array(bufferLength);

  try {
    // Créer une source temporaire pour analyser
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);

    // Analyser le spectre
    analyser.getFloatFrequencyData(dataArray);

    // Calculer l'énergie par bande de fréquence
    const sampleRate = audioBuffer.sampleRate;
    const nyquist = sampleRate / 2;

    // Basses: 20-250 Hz
    // Médiums: 250-4000 Hz
    // Aigus: 4000-20000 Hz

    let bassEnergy = 0;
    let midEnergy = 0;
    let trebleEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < bufferLength; i++) {
      const frequency = (i * nyquist) / bufferLength;
      const magnitude = Math.pow(10, dataArray[i] / 20); // Convertir dB en amplitude

      if (frequency >= 20 && frequency < 250) {
        bassEnergy += magnitude;
      } else if (frequency >= 250 && frequency < 4000) {
        midEnergy += magnitude;
      } else if (frequency >= 4000 && frequency <= 20000) {
        trebleEnergy += magnitude;
      }

      totalEnergy += magnitude;
    }

    // Normaliser les énergies (0-1)
    const normalizedBass = totalEnergy > 0 ? bassEnergy / totalEnergy : 0;
    const normalizedMid = totalEnergy > 0 ? midEnergy / totalEnergy : 0;
    const normalizedTreble = totalEnergy > 0 ? trebleEnergy / totalEnergy : 0;

    // Trouver la fréquence dominante
    let maxMagnitude = -Infinity;
    let dominantFreq = 0;

    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxMagnitude) {
        maxMagnitude = dataArray[i];
        dominantFreq = (i * nyquist) / bufferLength;
      }
    }

    // Suggérer un preset basé sur l'analyse
    const suggestedPreset = suggestPreset(normalizedBass, normalizedMid, normalizedTreble, dominantFreq);
    const confidence = calculateConfidence(normalizedBass, normalizedMid, normalizedTreble);

    return {
      dominantFrequency: dominantFreq,
      bassEnergy: normalizedBass,
      midEnergy: normalizedMid,
      trebleEnergy: normalizedTreble,
      suggestedPreset,
      confidence,
    };
  } finally {
    await audioContext.close();
  }
}

/**
 * Analyse le spectre d'un Blob audio
 */
export async function analyzeSpectrumFromBlob(blob: Blob): Promise<SpectralAnalysisResult> {
  if (typeof window === 'undefined') {
    throw new Error('Analyse spectrale ne peut être utilisée que dans le navigateur');
  }

  const AudioContextClass =
    window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Web Audio API non supportée');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContextClass();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return await analyzeSpectrum(audioBuffer);
  } finally {
    await audioContext.close();
  }
}

/**
 * Suggère un preset basé sur l'analyse spectrale
 */
function suggestPreset(
  bassEnergy: number,
  midEnergy: number,
  trebleEnergy: number,
  dominantFreq: number,
): EqualizerPreset {
  // Si les basses sont faibles, suggérer Bass Boost
  if (bassEnergy < 0.25 && dominantFreq < 500) {
    return 'bass-boost';
  }

  // Si les médiums sont dominants (voix), suggérer Vocal Clarity
  if (midEnergy > 0.5 && dominantFreq >= 1000 && dominantFreq <= 5000) {
    return 'vocal-clarity';
  }

  // Si les aigus sont faibles, suggérer Bright
  if (trebleEnergy < 0.2) {
    return 'bright';
  }

  // Si les médiums sont faibles mais basses/aigus OK, suggérer Warm
  if (midEnergy < 0.3 && bassEnergy > 0.3 && trebleEnergy > 0.3) {
    return 'warm';
  }

  // Par défaut, pas d'égalisation
  return 'none';
}

/**
 * Calcule la confiance de la suggestion (0-1)
 */
function calculateConfidence(bassEnergy: number, midEnergy: number, trebleEnergy: number): number {
  // Plus la distribution est déséquilibrée, plus la confiance est élevée
  const maxEnergy = Math.max(bassEnergy, midEnergy, trebleEnergy);
  const minEnergy = Math.min(bassEnergy, midEnergy, trebleEnergy);
  const imbalance = maxEnergy - minEnergy;

  // Confiance basée sur le déséquilibre (0.3 = déséquilibre modéré)
  return Math.min(1, imbalance * 2);
}

