/**
 * Service de synchronisation rythmique et création de boucles
 */

import { findLoopPoints } from './loopDetection.service';
import type { RhythmSyncOptions, SyncedLoopResult, LoopPoint } from '../../types/rhythm.types';

/**
 * Crée une sonnerie bouclée parfaitement synchronisée
 */
export async function createSyncedLoop(
  audioBuffer: AudioBuffer,
  options: RhythmSyncOptions,
): Promise<SyncedLoopResult> {
  const {
    bpm,
    beatsPerLoop,
    loopStartSeconds,
    loopEndSeconds,
    crossfadeDurationMs = 50,
    snapToBeat = true,
  } = options;

  // 1. Déterminer les points de boucle
  let startSeconds: number;
  let endSeconds: number;
  let loopPoint: LoopPoint;

  if (loopStartSeconds !== undefined && loopEndSeconds !== undefined) {
    // Utiliser les points fournis
    startSeconds = snapToBeat ? alignToBeatGrid(loopStartSeconds, bpm) : loopStartSeconds;
    endSeconds = snapToBeat ? alignToBeatGrid(loopEndSeconds, bpm) : loopEndSeconds;

    loopPoint = {
      startSeconds,
      endSeconds,
      quality: 1.0,
      beatsCount: beatsPerLoop,
      measureCount: beatsPerLoop / 4,
    };
  } else {
    // Détecter automatiquement les meilleurs points
    const loopPoints = await findLoopPoints(audioBuffer, {
      bpm,
      beatsPerLoop,
    });

    if (loopPoints.length === 0) {
      throw new Error('Aucun point de boucle valide trouvé. Essayez avec un autre BPM ou une autre longueur.');
    }

    const bestLoop = loopPoints[0];
    startSeconds = bestLoop.startSeconds;
    endSeconds = bestLoop.endSeconds;
    loopPoint = bestLoop;
  }

  // 2. Découper l'audio selon les points de boucle
  const loopedBuffer = trimToRange(audioBuffer, startSeconds, endSeconds);

  // 3. Ajuster la durée pour correspondre exactement à un nombre entier de mesures
  const adjustedBuffer = adjustToMeasureBoundary(loopedBuffer, bpm, beatsPerLoop);

  // 4. Appliquer le crossfade
  const crossfadedBuffer = applyCrossfade(adjustedBuffer, crossfadeDurationMs);

  // 5. Encoder en WAV
  const resultBlob = await renderToWavBlob(crossfadedBuffer, audioBuffer.sampleRate);

  return {
    loopedBlob: resultBlob,
    durationSeconds: crossfadedBuffer.duration,
    loopPoint,
    quality: loopPoint.quality,
  };
}

/**
 * Aligne un temps sur la grille rythmique
 */
function alignToBeatGrid(timeSeconds: number, bpm: number): number {
  const secondsPerBeat = 60 / bpm;
  const beatIndex = Math.round(timeSeconds / secondsPerBeat);
  return beatIndex * secondsPerBeat;
}

/**
 * Découpe un AudioBuffer selon une plage temporelle
 */
function trimToRange(audioBuffer: AudioBuffer, startSeconds: number, endSeconds: number): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(startSeconds * sampleRate);
  const endSample = Math.floor(endSeconds * sampleRate);
  const frameCount = endSample - startSample;

  if (frameCount <= 0) {
    throw new Error('Plage de boucle invalide');
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

/**
 * Ajuste la durée pour correspondre exactement à un nombre entier de mesures
 */
function adjustToMeasureBoundary(
  audioBuffer: AudioBuffer,
  bpm: number,
  beatsPerLoop: number,
): AudioBuffer {
  const secondsPerBeat = 60 / bpm;
  const targetDuration = secondsPerBeat * beatsPerLoop;
  const currentDuration = audioBuffer.duration;

  // Si la durée est déjà proche de la cible, ne rien faire
  const tolerance = 0.01; // 10ms de tolérance
  if (Math.abs(currentDuration - targetDuration) < tolerance) {
    return audioBuffer;
  }

  // Ajuster en tronquant ou en répétant la dernière mesure
  const sampleRate = audioBuffer.sampleRate;
  const targetSamples = Math.floor(targetDuration * sampleRate);
  const currentSamples = audioBuffer.length;

  if (targetSamples === currentSamples) {
    return audioBuffer;
  }

  const adjustedBuffer = new AudioBuffer({
    length: targetSamples,
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
  });

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const input = audioBuffer.getChannelData(channel);
    const output = adjustedBuffer.getChannelData(channel);

    if (targetSamples <= currentSamples) {
      // Tronquer
      for (let i = 0; i < targetSamples; i++) {
        output[i] = input[i];
      }
    } else {
      // Répéter la dernière partie
      for (let i = 0; i < currentSamples; i++) {
        output[i] = input[i];
      }
      // Répéter les derniers échantillons pour remplir
      const remaining = targetSamples - currentSamples;
      for (let i = 0; i < remaining; i++) {
        output[currentSamples + i] = input[currentSamples - remaining + i];
      }
    }
  }

  return adjustedBuffer;
}

/**
 * Applique un crossfade entre le début et la fin
 */
function applyCrossfade(audioBuffer: AudioBuffer, crossfadeDurationMs: number): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate;
  const crossfadeSamples = Math.floor((crossfadeDurationMs / 1000) * sampleRate);
  const totalSamples = audioBuffer.length;

  if (crossfadeSamples === 0 || crossfadeSamples >= totalSamples / 2) {
    return audioBuffer; // Pas de crossfade si trop court ou trop long
  }

  const crossfadedBuffer = new AudioBuffer({
    length: totalSamples,
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
  });

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const input = audioBuffer.getChannelData(channel);
    const output = crossfadedBuffer.getChannelData(channel);

    // Copier le milieu sans modification
    for (let i = crossfadeSamples; i < totalSamples - crossfadeSamples; i++) {
      output[i] = input[i];
    }

    // Appliquer le crossfade sur les extrémités
    for (let i = 0; i < crossfadeSamples; i++) {
      const t = i / crossfadeSamples; // 0 à 1
      const fadeIn = t; // Fade-in sur le début
      const fadeOut = 1 - t; // Fade-out sur la fin

      // Mixer le début (fade-in) et la fin (fade-out)
      const startValue = input[i];
      const endValue = input[totalSamples - crossfadeSamples + i];
      output[i] = fadeIn * startValue + fadeOut * endValue;
      output[totalSamples - crossfadeSamples + i] = fadeOut * endValue + fadeIn * startValue;
    }
  }

  return crossfadedBuffer;
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
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);

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

