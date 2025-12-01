export interface SmartRingtoneOptions {
  /** Niveau max cible pour la normalisation (0-1). */
  targetPeak?: number;
  /** Durée du fade in en secondes. */
  fadeInSeconds?: number;
  /** Durée du fade out en secondes. */
  fadeOutSeconds?: number;
  /** Durée max autorisée (en secondes). */
  maxDurationSeconds?: number;
}

export interface SmartRingtoneResult {
  optimizedBlob: Blob;
  /** Durée en secondes de l'audio optimisé. */
  durationSeconds: number;
}

const DEFAULT_OPTIONS: Required<SmartRingtoneOptions> = {
  targetPeak: 0.9,
  fadeInSeconds: 0.15,
  fadeOutSeconds: 0.3,
  maxDurationSeconds: 40,
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
  const mergedOptions: Required<SmartRingtoneOptions> = {
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

    const trimmed = trimSilence(audioBuffer);
    if (!trimmed) {
      throw new Error("Impossible de détecter un son utile dans l'enregistrement.");
    }

    const normalized = normalizeBuffer(trimmed, mergedOptions.targetPeak);
    const withFades = applyFades(
      normalized,
      mergedOptions.fadeInSeconds,
      mergedOptions.fadeOutSeconds,
    );
    const limited = limitDuration(withFades, mergedOptions.maxDurationSeconds);

    const resultBlob = await renderToWavBlob(limited, audioContext.sampleRate);

    return {
      optimizedBlob: resultBlob,
      durationSeconds: limited.duration,
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

// Encode un AudioBuffer en WAV (PCM 16 bits)
async function renderToWavBlob(audioBuffer: AudioBuffer, sampleRate: number): Promise<Blob> {
  const numChannels = audioBuffer.numberOfChannels;
  const numSamples = audioBuffer.length;

  const bytesPerSample = 2; // 16 bits
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // bits per sample

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
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
