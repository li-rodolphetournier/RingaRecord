/**
 * Service d'égalisation audio utilisant Web Audio API BiquadFilterNode
 */

import type {
  EqualizerPreset,
  EqualizerBand,
  EqualizerPresetConfig,
  EqualizerResult,
} from '../../types/equalizer.types';

/**
 * Presets d'égalisation prédéfinis
 */
export const EQUALIZER_PRESETS: Record<EqualizerPreset, EqualizerPresetConfig> = {
  none: {
    id: 'none',
    name: 'Aucun',
    description: 'Pas d\'égalisation',
    bands: [],
  },
  'bass-boost': {
    id: 'bass-boost',
    name: 'Bass Boost',
    description: 'Renforce les basses pour plus de profondeur',
    bands: [
      { frequency: 60, gain: 6, q: 1.0 },
      { frequency: 120, gain: 4, q: 1.0 },
      { frequency: 250, gain: 2, q: 0.8 },
    ],
  },
  'vocal-clarity': {
    id: 'vocal-clarity',
    name: 'Vocal Clarity',
    description: 'Améliore la clarté des voix et paroles',
    bands: [
      { frequency: 2000, gain: 4, q: 2.0 },
      { frequency: 3000, gain: 5, q: 2.0 },
      { frequency: 5000, gain: 3, q: 1.5 },
      { frequency: 250, gain: -2, q: 1.0 }, // Réduit légèrement les basses
    ],
  },
  bright: {
    id: 'bright',
    name: 'Bright',
    description: 'Éclaire les aigus pour plus de brillance',
    bands: [
      { frequency: 4000, gain: 5, q: 1.5 },
      { frequency: 8000, gain: 6, q: 1.5 },
      { frequency: 12000, gain: 4, q: 1.0 },
      { frequency: 500, gain: -1, q: 1.0 }, // Réduit légèrement les médiums graves
    ],
  },
  warm: {
    id: 'warm',
    name: 'Warm',
    description: 'Ajoute de la chaleur avec des médiums renforcés',
    bands: [
      { frequency: 500, gain: 4, q: 1.0 },
      { frequency: 1000, gain: 5, q: 1.0 },
      { frequency: 2000, gain: 3, q: 1.0 },
      { frequency: 8000, gain: -2, q: 1.0 }, // Réduit légèrement les aigus
    ],
  },
};

/**
 * Applique un preset d'égalisation à un AudioBuffer
 */
export async function applyEqualizerPreset(
  audioBuffer: AudioBuffer,
  preset: EqualizerPreset,
): Promise<AudioBuffer> {
  if (preset === 'none' || !EQUALIZER_PRESETS[preset]) {
    return audioBuffer;
  }

  const presetConfig = EQUALIZER_PRESETS[preset];
  if (presetConfig.bands.length === 0) {
    return audioBuffer;
  }

  const AudioContextClass =
    window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Web Audio API non supportée');
  }

  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate,
  );

  try {
    // Créer la source audio
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    // Créer une chaîne de filtres pour chaque bande
    let currentNode: AudioNode = source;

    for (const band of presetConfig.bands) {
      const filter = offlineContext.createBiquadFilter();
      filter.type = 'peaking'; // Type de filtre pour égalisation
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;

      currentNode.connect(filter);
      currentNode = filter;
    }

    // Connecter à la destination
    currentNode.connect(offlineContext.destination);

    // Démarrer la source
    source.start(0);

    // Rendre le buffer égalisé
    const equalizedBuffer = await offlineContext.startRendering();

    return equalizedBuffer;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'égalisation';
    throw new Error(`Égalisation échouée: ${message}`);
  }
}

/**
 * Applique un preset d'égalisation à un Blob audio
 */
export async function applyEqualizerPresetToBlob(
  blob: Blob,
  preset: EqualizerPreset,
): Promise<EqualizerResult> {
  if (typeof window === 'undefined') {
    throw new Error('Égaliseur ne peut être utilisé que dans le navigateur');
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
    const equalizedBuffer = await applyEqualizerPreset(audioBuffer, preset);

    // Encoder en WAV
    const resultBlob = await renderToWavBlob(equalizedBuffer, audioContext.sampleRate);

    return {
      equalizedBlob: resultBlob,
      durationSeconds: equalizedBuffer.duration,
      presetUsed: preset,
    };
  } finally {
    await audioContext.close();
  }
}

/**
 * Applique des bandes d'égalisation personnalisées
 */
export async function applyCustomEqualizer(
  audioBuffer: AudioBuffer,
  bands: EqualizerBand[],
): Promise<AudioBuffer> {
  if (bands.length === 0) {
    return audioBuffer;
  }

  const AudioContextClass =
    window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Web Audio API non supportée');
  }

  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate,
  );

  try {
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    let currentNode: AudioNode = source;

    for (const band of bands) {
      const filter = offlineContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = Math.max(20, Math.min(20000, band.frequency));
      filter.gain.value = Math.max(-20, Math.min(20, band.gain));
      filter.Q.value = Math.max(0.1, Math.min(10, band.q));

      currentNode.connect(filter);
      currentNode = filter;
    }

    currentNode.connect(offlineContext.destination);
    source.start(0);

    return await offlineContext.startRendering();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'égalisation personnalisée';
    throw new Error(`Égalisation personnalisée échouée: ${message}`);
  }
}

/**
 * Encode un AudioBuffer en WAV (PCM 16 bits)
 */
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

