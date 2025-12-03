/**
 * Service de détection de points de boucle optimaux
 * Basé sur la phase audio et la structure rythmique
 */

import type { LoopPoint, LoopDetectionOptions } from '../../types/rhythm.types';

/**
 * Trouve les meilleurs points de boucle pour un AudioBuffer
 */
export async function findLoopPoints(
  audioBuffer: AudioBuffer,
  options: LoopDetectionOptions,
): Promise<LoopPoint[]> {
  const {
    bpm,
    beatsPerLoop = 4,
    minLoopDuration = 1,
    maxLoopDuration = 40,
    qualityThreshold = 0.7,
  } = options;

  // 1. Calculer la durée d'une mesure
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerLoop;

  // 2. Générer des candidats de boucle
  const candidates = generateLoopCandidates(
    audioBuffer,
    secondsPerMeasure,
    minLoopDuration,
    maxLoopDuration,
    beatsPerLoop,
  );

  // 3. Évaluer chaque candidat
  const evaluatedCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      const quality = await testLoopQuality(
        audioBuffer,
        candidate.startSeconds,
        candidate.endSeconds,
      );
      return {
        ...candidate,
        quality,
        measureCount: candidate.beatsCount / beatsPerLoop,
      };
    }),
  );

  // 4. Filtrer et trier par qualité
  return evaluatedCandidates
    .filter((candidate) => candidate.quality >= qualityThreshold)
    .sort((a, b) => b.quality - a.quality);
}

/**
 * Génère des candidats de points de boucle
 */
function generateLoopCandidates(
  audioBuffer: AudioBuffer,
  secondsPerMeasure: number,
  minDuration: number,
  maxDuration: number,
  beatsPerLoop: number,
): Array<{ startSeconds: number; endSeconds: number; beatsCount: number }> {
  const candidates: Array<{ startSeconds: number; endSeconds: number; beatsCount: number }> = [];
  const totalDuration = audioBuffer.duration;

  // Générer des boucles de différentes longueurs (1, 2, 4, 8 mesures)
  const measureCounts = [1, 2, 4, 8];

  for (const measureCount of measureCounts) {
    const loopDuration = secondsPerMeasure * measureCount;
    const beatsCount = measureCount * beatsPerLoop;

    if (loopDuration < minDuration || loopDuration > maxDuration) {
      continue;
    }

    // Essayer plusieurs positions de départ
    const maxStart = totalDuration - loopDuration;
    const stepSize = secondsPerMeasure / 4; // Essayer tous les quarts de mesure

    for (let start = 0; start <= maxStart; start += stepSize) {
      const end = start + loopDuration;
      if (end <= totalDuration) {
        candidates.push({
          startSeconds: start,
          endSeconds: end,
          beatsCount,
        });
      }
    }
  }

  return candidates;
}

/**
 * Teste la qualité d'une boucle en calculant la corrélation croisée
 */
async function testLoopQuality(
  audioBuffer: AudioBuffer,
  startSeconds: number,
  endSeconds: number,
): Promise<number> {
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.1); // 100ms de fenêtre

  const startSample = Math.floor(startSeconds * sampleRate);
  const endSample = Math.floor(endSeconds * sampleRate);

  // Extraire les fenêtres de début et fin
  const startWindow = extractWindow(audioBuffer, startSample, windowSize);
  const endWindow = extractWindow(audioBuffer, endSample - windowSize, windowSize);

  // Calculer la corrélation croisée
  const correlation = calculateCrossCorrelation(startWindow, endWindow);

  // Test de continuité (pas de saut d'amplitude)
  const continuityScore = testContinuity(audioBuffer, startSample, endSample - windowSize);

  // Score final : moyenne pondérée
  return correlation * 0.7 + continuityScore * 0.3;
}

/**
 * Extrait une fenêtre d'échantillons
 */
function extractWindow(audioBuffer: AudioBuffer, startSample: number, windowSize: number): Float32Array {
  const channelData = audioBuffer.getChannelData(0);
  const endSample = Math.min(startSample + windowSize, channelData.length);
  return channelData.slice(startSample, endSample);
}

/**
 * Calcule la corrélation croisée entre deux fenêtres
 */
function calculateCrossCorrelation(window1: Float32Array, window2: Float32Array): number {
  if (window1.length !== window2.length || window1.length === 0) {
    return 0;
  }

  // Calculer les moyennes
  const mean1 = window1.reduce((a, b) => a + b, 0) / window1.length;
  const mean2 = window2.reduce((a, b) => a + b, 0) / window2.length;

  // Calculer les écarts-types
  const variance1 =
    window1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / window1.length;
  const variance2 =
    window2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / window2.length;
  const std1 = Math.sqrt(variance1);
  const std2 = Math.sqrt(variance2);

  if (std1 === 0 || std2 === 0) {
    return 0;
  }

  // Calculer la corrélation
  let correlation = 0;
  for (let i = 0; i < window1.length; i++) {
    correlation += ((window1[i] - mean1) * (window2[i] - mean2)) / (std1 * std2);
  }

  // Normaliser entre 0 et 1
  const normalized = correlation / window1.length;
  return Math.max(0, Math.min(1, (normalized + 1) / 2)); // Convertir de [-1, 1] à [0, 1]
}

/**
 * Teste la continuité entre deux points (pas de saut d'amplitude)
 */
function testContinuity(audioBuffer: AudioBuffer, startSample: number, endSample: number): number {
  const channelData = audioBuffer.getChannelData(0);
  if (startSample >= channelData.length || endSample >= channelData.length) {
    return 0;
  }

  const startValue = channelData[startSample];
  const endValue = channelData[endSample];

  // Calculer la différence relative
  const diff = Math.abs(startValue - endValue);
  const maxAmplitude = Math.max(Math.abs(startValue), Math.abs(endValue), 0.01);

  // Score : 1 = parfait, 0 = très mauvais
  return Math.max(0, 1 - diff / maxAmplitude);
}