import { MAX_RINGTONE_DURATION_SECONDS } from '../../utils/ringtoneConstants';

export interface SmartRingtoneOptions {
  /** Niveau max cible pour la normalisation (0-1). */
  targetPeak?: number;
  /** Durée du fade in en secondes. */
  fadeInSeconds?: number;
  /** Durée du fade out en secondes. */
  fadeOutSeconds?: number;
  /** Durée max autorisée (en secondes). */
  maxDurationSeconds?: number;
  /** Début manuel de la découpe (en secondes). Si défini avec manualEndSeconds, remplace l'auto-trim. */
  manualStartSeconds?: number;
  /** Fin manuelle de la découpe (en secondes). Doit être > manualStartSeconds. */
  manualEndSeconds?: number;
  /** Seuil de volume (en dB, valeur négative) pour considérer qu'une zone est silencieuse. */
  silenceThresholdDb?: number;
  /** Durée minimale (en millisecondes) pendant laquelle le signal doit être silencieux pour créer une séparation. */
  minSilenceDurationMs?: number;
}

export interface SmartRingtoneSegment {
  /** Identifiant simple (1, 2, 3, ...) pour l'affichage. */
  id: number;
  /** Début du segment en secondes (par rapport à l'audio original complet). */
  startSeconds: number;
  /** Fin du segment en secondes (par rapport à l'audio original complet). */
  endSeconds: number;
  /** Durée du segment en secondes. */
  durationSeconds: number;
}

export interface SmartRingtoneResult {
  optimizedBlob: Blob;
  /** Durée en secondes de l'audio optimisé. */
  durationSeconds: number;
  /** Segments détectés sur l'audio original (pour UI multi-parties). */
  segments: SmartRingtoneSegment[];
}

interface InternalSmartOptions {
  targetPeak: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  maxDurationSeconds: number;
  manualStartSeconds?: number;
  manualEndSeconds?: number;
  silenceThresholdDb: number;
  minSilenceDurationMs: number;
}

const DEFAULT_OPTIONS: InternalSmartOptions = {
  targetPeak: 0.9,
  fadeInSeconds: 0.15,
  fadeOutSeconds: 0.3,
  maxDurationSeconds: MAX_RINGTONE_DURATION_SECONDS,
  silenceThresholdDb: -40,
  minSilenceDurationMs: 200,
};

/**
 * Optimise un Blob audio pour une sonnerie :
 * - trim des silences début/fin
 * - normalisation
 * - fade in / fade out
 */
export async function optimizeRingtone(
  blob: Blob,
  options: SmartRingtoneOptions = {},
): Promise<SmartRingtoneResult> {
  const mergedOptions: InternalSmartOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (typeof window === 'undefined') {
    throw new Error('SmartRingtone ne peut être utilisé que dans le navigateur.');
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

    const segments = detectSegments(
      audioBuffer,
      mergedOptions.silenceThresholdDb,
      mergedOptions.minSilenceDurationMs,
    );

    const hasManualRange =
      typeof mergedOptions.manualStartSeconds === 'number' &&
      typeof mergedOptions.manualEndSeconds === 'number' &&
      mergedOptions.manualEndSeconds > mergedOptions.manualStartSeconds;

    const baseBuffer = hasManualRange
      ? trimToRange(
          audioBuffer,
          mergedOptions.manualStartSeconds as number,
          mergedOptions.manualEndSeconds as number,
        )
      : segments.length > 0
        ? trimToRange(audioBuffer, segments[0].startSeconds, segments[0].endSeconds)
        : trimSilence(audioBuffer);

    if (!baseBuffer) {
      throw new Error("Impossible de détecter un son utile dans l'enregistrement.");
    }

    const normalized = normalizeBuffer(baseBuffer, mergedOptions.targetPeak);
    const withFades = applyFades(
      normalized,
      mergedOptions.fadeInSeconds,
      mergedOptions.fadeOutSeconds,
    );
    const limited = limitDuration(withFades, mergedOptions.maxDurationSeconds);

    const copyright = `© ${new Date().getFullYear()} RingaRecord. All rights reserved.`;
    const resultBlob = await renderToWavBlob(limited, audioContext.sampleRate, copyright);

    return {
      optimizedBlob: resultBlob,
      durationSeconds: limited.duration,
      segments,
    };
  } finally {
    await audioContext.close();
  }
}

function trimSilence(audioBuffer: AudioBuffer): AudioBuffer | null {
  const channelData = audioBuffer.getChannelData(0);
  const length = channelData.length;

  if (length === 0) {
    return null;
  }

  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.max(256, Math.floor(sampleRate * 0.01)); // ~10ms
  const silenceThreshold = 0.01; // amplitude

  let startIndex = 0;
  let endIndex = length - 1;

  // Chercher début non silencieux
  for (let i = 0; i < length; i += windowSize) {
    const windowEnd = Math.min(i + windowSize, length);
    let maxAmplitude = 0;
    for (let j = i; j < windowEnd; j++) {
      const sample = Math.abs(channelData[j]);
      if (sample > maxAmplitude) {
        maxAmplitude = sample;
      }
    }
    if (maxAmplitude > silenceThreshold) {
      startIndex = i;
      break;
    }
  }

  // Chercher fin non silencieuse
  for (let i = length - 1; i >= 0; i -= windowSize) {
    const windowStart = Math.max(0, i - windowSize);
    let maxAmplitude = 0;
    for (let j = i; j >= windowStart; j--) {
      const sample = Math.abs(channelData[j]);
      if (sample > maxAmplitude) {
        maxAmplitude = sample;
      }
    }
    if (maxAmplitude > silenceThreshold) {
      endIndex = i;
      break;
    }
  }

  if (endIndex <= startIndex) {
    return null;
  }

  // Ajouter une petite marge (50ms) de chaque côté
  const marginSamples = Math.floor(sampleRate * 0.05);
  const safeStart = Math.max(0, startIndex - marginSamples);
  const safeEnd = Math.min(length - 1, endIndex + marginSamples);
  const frameCount = safeEnd - safeStart + 1;

  const trimmedBuffer = new AudioBuffer({
    length: frameCount,
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
  });

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const input = audioBuffer.getChannelData(channel);
    const output = trimmedBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      output[i] = input[safeStart + i];
    }
  }

  return trimmedBuffer;
}

function dbToAmplitude(db: number): number {
  // db est négatif, on renvoie une amplitude dans [0, 1]
  const amp = 10 ** (db / 20);
  if (!Number.isFinite(amp) || amp <= 0) {
    return 0.0001;
  }
  return Math.min(Math.max(amp, 0.000001), 1);
}

function detectSegments(
  audioBuffer: AudioBuffer,
  silenceThresholdDb: number,
  minSilenceDurationMs: number,
): SmartRingtoneSegment[] {
  const channelData = audioBuffer.getChannelData(0);
  const length = channelData.length;

  if (length === 0) {
    return [];
  }

  const sampleRate = audioBuffer.sampleRate;
  const windowDurationMs = 20;
  const windowSize = Math.max(128, Math.floor((sampleRate * windowDurationMs) / 1000));
  const silenceThresholdAmp = dbToAmplitude(silenceThresholdDb);
  const totalWindows = Math.ceil(length / windowSize);
  const minSilentWindows = Math.max(1, Math.floor(minSilenceDurationMs / windowDurationMs));

  const windowIsSilent: boolean[] = new Array(totalWindows);

  for (let w = 0; w < totalWindows; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, length);
    let maxAmplitude = 0;
    for (let i = start; i < end; i++) {
      const sample = Math.abs(channelData[i]);
      if (sample > maxAmplitude) {
        maxAmplitude = sample;
      }
    }
    windowIsSilent[w] = maxAmplitude < silenceThresholdAmp;
  }

  const segments: SmartRingtoneSegment[] = [];

  let currentSegmentStartWindow: number | null = null;
  let silentStreak = 0;

  const flushSegment = (endWindowExclusive: number) => {
    if (currentSegmentStartWindow === null) {
      return;
    }
    const startSample = currentSegmentStartWindow * windowSize;
    const endSample = Math.min(endWindowExclusive * windowSize, length);
    if (endSample <= startSample) {
      currentSegmentStartWindow = null;
      return;
    }
    const startSeconds = startSample / sampleRate;
    const endSeconds = endSample / sampleRate;
    const durationSeconds = endSeconds - startSeconds;
    if (durationSeconds <= 0.05) {
      // On ignore les segments ultra courts
      currentSegmentStartWindow = null;
      return;
    }
    const id = segments.length + 1;
    segments.push({
      id,
      startSeconds,
      endSeconds,
      durationSeconds,
    });
    currentSegmentStartWindow = null;
  };

  for (let w = 0; w < totalWindows; w++) {
    if (windowIsSilent[w]) {
      silentStreak += 1;
      if (silentStreak >= minSilentWindows) {
        const silentStartWindow = w - silentStreak + 1;
        flushSegment(silentStartWindow);
      }
    } else {
      if (currentSegmentStartWindow === null) {
        currentSegmentStartWindow = w;
      }
      silentStreak = 0;
    }
  }

  if (currentSegmentStartWindow !== null) {
    flushSegment(totalWindows);
  }

  return segments;
}

function trimToRange(
  audioBuffer: AudioBuffer,
  startSeconds: number,
  endSeconds: number,
): AudioBuffer | null {
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;

  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
    return null;
  }

  const startSample = Math.max(0, Math.min(totalSamples - 1, Math.floor(startSeconds * sampleRate)));
  const endSample = Math.max(startSample + 1, Math.min(totalSamples, Math.floor(endSeconds * sampleRate)));

  const frameCount = endSample - startSample;
  if (frameCount <= 0) {
    return null;
  }

  const trimmedBuffer = new AudioBuffer({
    length: frameCount,
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
  });

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const input = audioBuffer.getChannelData(channel);
    const output = trimmedBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      output[i] = input[startSample + i];
    }
  }

  return trimmedBuffer;
}

function normalizeBuffer(audioBuffer: AudioBuffer, targetPeak: number): AudioBuffer {
  const cloned = cloneBuffer(audioBuffer);
  let maxAmplitude = 0;

  for (let channel = 0; channel < cloned.numberOfChannels; channel++) {
    const data = cloned.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      const sample = Math.abs(data[i]);
      if (sample > maxAmplitude) {
        maxAmplitude = sample;
      }
    }
  }

  if (maxAmplitude === 0 || !Number.isFinite(maxAmplitude)) {
    return cloned;
  }

  const gain = Math.min(targetPeak / maxAmplitude, 4); // limiter le boost max

  for (let channel = 0; channel < cloned.numberOfChannels; channel++) {
    const data = cloned.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      let value = data[i] * gain;
      // clamp pour éviter le clipping dur
      if (value > 1) value = 1;
      if (value < -1) value = -1;
      data[i] = value;
    }
  }

  return cloned;
}

function applyFades(
  audioBuffer: AudioBuffer,
  fadeInSeconds: number,
  fadeOutSeconds: number,
): AudioBuffer {
  const cloned = cloneBuffer(audioBuffer);
  const sampleRate = cloned.sampleRate;
  const totalSamples = cloned.length;

  const fadeInSamples = Math.min(totalSamples, Math.floor(sampleRate * fadeInSeconds));
  const fadeOutSamples = Math.min(totalSamples, Math.floor(sampleRate * fadeOutSeconds));

  for (let channel = 0; channel < cloned.numberOfChannels; channel++) {
    const data = cloned.getChannelData(channel);

    // Fade in
    for (let i = 0; i < fadeInSamples; i++) {
      const t = i / Math.max(1, fadeInSamples);
      data[i] *= t;
    }

    // Fade out
    for (let i = 0; i < fadeOutSamples; i++) {
      const idx = totalSamples - 1 - i;
      if (idx < 0) break;
      const t = i / Math.max(1, fadeOutSamples);
      const factor = 1 - t;
      data[idx] *= factor;
    }
  }

  return cloned;
}

function limitDuration(audioBuffer: AudioBuffer, maxSeconds: number): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate;
  const maxSamples = Math.floor(sampleRate * maxSeconds);

  if (audioBuffer.length <= maxSamples) {
    return audioBuffer;
  }

  const limitedBuffer = new AudioBuffer({
    length: maxSamples,
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
  });

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const input = audioBuffer.getChannelData(channel);
    const output = limitedBuffer.getChannelData(channel);
    for (let i = 0; i < maxSamples; i++) {
      output[i] = input[i];
    }
  }

  return limitedBuffer;
}

function cloneBuffer(audioBuffer: AudioBuffer): AudioBuffer {
  const cloned = new AudioBuffer({
    length: audioBuffer.length,
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
  });

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    cloned.copyToChannel(audioBuffer.getChannelData(channel), channel);
  }

  return cloned;
}

/**
 * Construit un chunk LIST/INFO avec métadonnées copyright
 */
function buildInfoChunk(copyright: string): ArrayBuffer {
  // Format LIST/INFO :
  // - 'LIST' (4 bytes)
  // - Taille du chunk (4 bytes, little-endian)
  // - 'INFO' (4 bytes)
  // - Champs de métadonnées (chaque champ = ID (4 bytes) + Taille (4 bytes) + Données (padded à pair))

  const fields: Array<{ id: string; value: string }> = [
    { id: 'ICOP', value: copyright }, // Copyright
    { id: 'ISFT', value: 'RingaRecord' }, // Software
  ];

  let chunkSize = 4; // 'INFO'

  for (const field of fields) {
    chunkSize += 4; // ID
    chunkSize += 4; // Taille
    const valueBytes = new TextEncoder().encode(field.value);
    chunkSize += valueBytes.length;
    // Padding à pair
    if (valueBytes.length % 2 !== 0) {
      chunkSize += 1;
    }
  }

  const buffer = new ArrayBuffer(8 + chunkSize);
  const view = new DataView(buffer);
  let offset = 0;

  // 'LIST'
  view.setUint8(offset++, 'L'.charCodeAt(0));
  view.setUint8(offset++, 'I'.charCodeAt(0));
  view.setUint8(offset++, 'S'.charCodeAt(0));
  view.setUint8(offset++, 'T'.charCodeAt(0));

  // Taille du chunk
  view.setUint32(offset, chunkSize, true);
  offset += 4;

  // 'INFO'
  view.setUint8(offset++, 'I'.charCodeAt(0));
  view.setUint8(offset++, 'N'.charCodeAt(0));
  view.setUint8(offset++, 'F'.charCodeAt(0));
  view.setUint8(offset++, 'O'.charCodeAt(0));

  // Champs de métadonnées
  for (const field of fields) {
    // ID (4 bytes)
    for (let i = 0; i < 4; i++) {
      view.setUint8(offset++, field.id.charCodeAt(i));
    }

    // Taille (4 bytes, little-endian)
    const valueBytes = new TextEncoder().encode(field.value);
    view.setUint32(offset, valueBytes.length, true);
    offset += 4;

    // Données
    for (let i = 0; i < valueBytes.length; i++) {
      view.setUint8(offset++, valueBytes[i]);
    }

    // Padding à pair si nécessaire
    if (valueBytes.length % 2 !== 0) {
      view.setUint8(offset++, 0);
    }
  }

  return buffer;
}

// Encode un AudioBuffer en WAV (PCM 16 bits) avec métadonnées copyright
async function renderToWavBlob(
  audioBuffer: AudioBuffer,
  sampleRate: number,
  copyright?: string,
): Promise<Blob> {
  const numChannels = audioBuffer.numberOfChannels;
  const numSamples = audioBuffer.length;

  const bytesPerSample = 2; // 16 bits
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  // Construire le chunk LIST/INFO pour les métadonnées
  const copyrightText =
    copyright || `© ${new Date().getFullYear()} RingaRecord. All rights reserved.`;
  const infoChunk = buildInfoChunk(copyrightText);
  const infoChunkSize = infoChunk.byteLength;

  // Taille totale = RIFF header (12) + fmt chunk (24) + LIST chunk + data chunk (8 + dataSize)
  const totalSize = 12 + 24 + infoChunkSize + 8 + dataSize;
  const buffer = new ArrayBuffer(44 + infoChunkSize + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  let offset = 0;

  // RIFF header
  writeString(offset, 'RIFF');
  offset += 4;
  view.setUint32(offset, totalSize - 8, true); // Taille du fichier - 8
  offset += 4;
  writeString(offset, 'WAVE');
  offset += 4;

  // fmt chunk
  writeString(offset, 'fmt ');
  offset += 4;
  view.setUint32(offset, 16, true); // Subchunk1Size
  offset += 4;
  view.setUint16(offset, 1, true); // AudioFormat (1 = PCM)
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, byteRate, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bytesPerSample * 8, true); // bits per sample
  offset += 2;

  // LIST chunk avec INFO
  const infoChunkView = new Uint8Array(infoChunk);
  for (let i = 0; i < infoChunkSize; i++) {
    view.setUint8(offset + i, infoChunkView[i]);
  }
  offset += infoChunkSize;

  // data chunk
  writeString(offset, 'data');
  offset += 4;
  view.setUint32(offset, dataSize, true);
  offset += 4;

  // Écrire les données audio
  const channelData: Float32Array[] = [];
  for (let channel = 0; channel < numChannels; channel++) {
    channelData[channel] = audioBuffer.getChannelData(channel);
  }

  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channelData[channel][i];
      if (sample > 1) sample = 1;
      if (sample < -1) sample = -1;
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
