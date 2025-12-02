import { type BPMDetectionResult, type BPMDetectionOptions } from '../../types/bpm.types';

const DEFAULT_MIN_BPM = 60;
const DEFAULT_MAX_BPM = 200;

interface NormalizedSignalResult {
  signal: Float32Array;
  sampleRate: number;
}

/**
 * Normalise un AudioBuffer en un signal mono centré autour de 0,
 * et éventuellement sous‑échantillonné pour accélérer les calculs.
 */
const normalizeAudioBufferToMono = (
  audioBuffer: AudioBuffer,
  targetSampleRate = 44100,
): NormalizedSignalResult => {
  const sourceSampleRate = audioBuffer.sampleRate;
  const channelCount = audioBuffer.numberOfChannels;

  if (channelCount === 0 || audioBuffer.length === 0) {
    return {
      signal: new Float32Array(0),
      sampleRate: targetSampleRate,
    };
  }

  const length = audioBuffer.length;
  const mono = new Float32Array(length);

  // Moyenne des canaux
  for (let channel = 0; channel < channelCount; channel++) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / channelCount;
    }
  }

  // Si le sample rate est déjà proche de la cible, on garde tel quel.
  if (Math.abs(sourceSampleRate - targetSampleRate) < 1) {
    return {
      signal: mono,
      sampleRate: sourceSampleRate,
    };
  }

  // Sinon, rééchantillonnage simple par interpolation linéaire.
  const resampleRatio = targetSampleRate / sourceSampleRate;
  const targetLength = Math.max(1, Math.floor(length * resampleRatio));
  const resampled = new Float32Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const sourceIndex = i / resampleRatio;
    const indexFloor = Math.floor(sourceIndex);
    const indexCeil = Math.min(length - 1, indexFloor + 1);
    const t = sourceIndex - indexFloor;
    const sample =
      mono[indexFloor] * (1 - t) +
      mono[indexCeil] * t;
    resampled[i] = sample;
  }

  return {
    signal: resampled,
    sampleRate: targetSampleRate,
  };
};

/**
 * Calcule une enveloppe d'énergie simplifiée du signal, en découpant
 * en fenêtres et en prenant la moyenne de l'énergie.
 */
const computeEnergyEnvelope = (signal: Float32Array, windowSize: number): Float32Array => {
  if (signal.length === 0 || windowSize <= 0) {
    return new Float32Array(0);
  }

  const envelopeLength = Math.ceil(signal.length / windowSize);
  const envelope = new Float32Array(envelopeLength);

  for (let w = 0; w < envelopeLength; w++) {
    const start = w * windowSize;
    const end = Math.min(signal.length, start + windowSize);
    let sumSquares = 0;
    for (let i = start; i < end; i++) {
      const value = signal[i];
      sumSquares += value * value;
    }
    const windowCount = end - start || 1;
    envelope[w] = Math.sqrt(sumSquares / windowCount);
  }

  return envelope;
};

/**
 * Calcule l'autocorrélation simplifiée sur un range de lags.
 */
const autocorrelate = (signal: Float32Array, minLag: number, maxLag: number): Float32Array => {
  const resultLength = Math.max(0, maxLag - minLag + 1);
  const result = new Float32Array(resultLength);

  if (signal.length === 0 || resultLength === 0) {
    return result;
  }

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    const maxIndex = signal.length - lag;
    for (let i = 0; i < maxIndex; i++) {
      sum += signal[i] * signal[i + lag];
    }
    result[lag - minLag] = sum;
  }

  return result;
};

/**
 * Détecte le BPM à partir d'un AudioBuffer en utilisant une enveloppe
 * d'énergie + autocorrélation.
 */
export const detectBPMFromAudioBuffer = (
  audioBuffer: AudioBuffer,
  options: BPMDetectionOptions = {},
): BPMDetectionResult => {
  const minBPM = options.minBPM ?? DEFAULT_MIN_BPM;
  const maxBPM = options.maxBPM ?? DEFAULT_MAX_BPM;

  if (!Number.isFinite(minBPM) || !Number.isFinite(maxBPM) || minBPM <= 0 || maxBPM <= minBPM) {
    throw new Error('Plage de BPM invalide pour la détection.');
  }

  if (audioBuffer.length === 0 || audioBuffer.duration < 2) {
    return {
      bpm: minBPM,
      confidence: 0,
      method: 'autocorrelation',
    };
  }

  // Normalisation et enveloppe
  const { signal, sampleRate } = normalizeAudioBufferToMono(audioBuffer, 44100);

  // Fenêtre d'environ 10ms
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.01));
  const envelope = computeEnergyEnvelope(signal, windowSize);

  if (envelope.length < 4) {
    return {
      bpm: minBPM,
      confidence: 0,
      method: 'autocorrelation',
    };
  }

  // Convertir min/max BPM en lags en nombre d'échantillons d'enveloppe.
  // BPM -> période en secondes -> période en index d'enveloppe.
  const samplesPerSecondEnvelope = sampleRate / windowSize;
  const maxPeriodSeconds = 60 / minBPM;
  const minPeriodSeconds = 60 / maxBPM;

  const maxLag = Math.min(
    envelope.length - 2,
    Math.floor(maxPeriodSeconds * samplesPerSecondEnvelope),
  );
  const minLag = Math.max(
    1,
    Math.floor(minPeriodSeconds * samplesPerSecondEnvelope),
  );

  if (maxLag <= minLag) {
    return {
      bpm: minBPM,
      confidence: 0,
      method: 'autocorrelation',
    };
  }

  const ac = autocorrelate(envelope, minLag, maxLag);

  // Trouver le meilleur pic d'autocorrélation.
  let bestIndex = 0;
  let bestValue = -Infinity;
  let sumEnergy = 0;

  for (let i = 0; i < ac.length; i++) {
    const value = ac[i];
    sumEnergy += value;
    if (value > bestValue) {
      bestValue = value;
      bestIndex = i;
    }
  }

  if (!Number.isFinite(bestValue) || bestValue <= 0 || sumEnergy <= 0) {
    return {
      bpm: minBPM,
      confidence: 0,
      method: 'autocorrelation',
    };
  }

  const bestLag = bestIndex + minLag;
  const periodSeconds = bestLag / samplesPerSecondEnvelope;
  const bpm = 60 / periodSeconds;

  // Score de confiance simple : ratio entre le pic max et l'énergie totale.
  const confidenceRaw = bestValue / sumEnergy;
  const confidence = Math.max(0, Math.min(1, confidenceRaw));

  return {
    bpm,
    confidence,
    method: 'autocorrelation',
  };
};

/**
 * Détecte le BPM à partir d'un Blob audio (utilise Web Audio API).
 */
export const detectBPMFromBlob = async (
  blob: Blob,
  options: BPMDetectionOptions = {},
): Promise<BPMDetectionResult> => {
  if (typeof window === 'undefined') {
    throw new Error('La détection BPM ne peut être utilisée que dans le navigateur.');
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Web Audio API non supportée par ce navigateur.');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContextClass();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return detectBPMFromAudioBuffer(audioBuffer, options);
  } finally {
    await audioContext.close();
  }
};


