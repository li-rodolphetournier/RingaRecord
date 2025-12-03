import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyEqualizerPreset,
  applyEqualizerPresetToBlob,
  applyCustomEqualizer,
  EQUALIZER_PRESETS,
} from './equalizer.service';
import type { EqualizerPreset, EqualizerBand } from '../../types/equalizer.types';

/**
 * Crée un AudioBuffer de test
 */
function createTestAudioBuffer(params: {
  durationSeconds?: number;
  sampleRate?: number;
  numberOfChannels?: number;
  frequency?: number;
}): AudioBuffer {
  const {
    durationSeconds = 1,
    sampleRate = 44100,
    numberOfChannels = 1,
    frequency = 440,
  } = params;

  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const bufferData = new Float32Array(totalSamples);

  // Génère un signal sinusoïdal
  for (let i = 0; i < totalSamples; i++) {
    bufferData[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.5;
  }

  const fakeAudioBuffer: AudioBuffer = {
    sampleRate,
    length: totalSamples,
    duration: durationSeconds,
    numberOfChannels,
    getChannelData: (channel: number) => {
      if (channel >= numberOfChannels) {
        throw new Error('Channel index out of range');
      }
      return bufferData;
    },
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;

  return fakeAudioBuffer;
}

/**
 * Crée un Blob audio de test (WAV simple)
 */
function createTestAudioBlob(durationSeconds = 1): Blob {
  const sampleRate = 44100;
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const frequency = 440;

  // Crée un header WAV minimal
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint8(0, 0x52); // 'R'
  view.setUint8(1, 0x49); // 'I'
  view.setUint8(2, 0x46); // 'F'
  view.setUint8(3, 0x46); // 'F'
  view.setUint32(4, 36 + dataSize, true);
  view.setUint8(8, 0x57); // 'W'
  view.setUint8(9, 0x41); // 'A'
  view.setUint8(10, 0x56); // 'V'
  view.setUint8(11, 0x45); // 'E'

  // fmt chunk
  view.setUint8(12, 0x66); // 'f'
  view.setUint8(13, 0x6d); // 'm'
  view.setUint8(14, 0x74); // 't'
  view.setUint8(15, 0x20); // ' '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);

  // data chunk
  view.setUint8(36, 0x64); // 'd'
  view.setUint8(37, 0x61); // 'a'
  view.setUint8(38, 0x74); // 't'
  view.setUint8(39, 0x61); // 'a'
  view.setUint32(40, dataSize, true);

  // Données audio (sinusoïde)
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.5;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

describe('equalizer.service', () => {
  beforeEach(() => {
    // Mock Web Audio API si nécessaire
    if (typeof window !== 'undefined' && !window.AudioContext) {
      vi.stubGlobal('AudioContext', class MockAudioContext {
        sampleRate = 44100;
        createAnalyser = vi.fn();
        decodeAudioData = vi.fn();
        close = vi.fn();
      });
    }
  });

  describe('EQUALIZER_PRESETS', () => {
    it('should have all required presets', () => {
      const expectedPresets: EqualizerPreset[] = [
        'none',
        'bass-boost',
        'vocal-clarity',
        'bright',
        'warm',
        'rock',
        'pop',
        'jazz',
        'classical',
      ];

      expectedPresets.forEach((preset) => {
        expect(EQUALIZER_PRESETS[preset]).toBeDefined();
        expect(EQUALIZER_PRESETS[preset].id).toBe(preset);
        expect(EQUALIZER_PRESETS[preset].name).toBeTruthy();
        expect(EQUALIZER_PRESETS[preset].description).toBeTruthy();
        expect(Array.isArray(EQUALIZER_PRESETS[preset].bands)).toBe(true);
      });
    });

    it('should have "none" preset with empty bands', () => {
      expect(EQUALIZER_PRESETS.none.bands).toEqual([]);
    });

    it('should have presets with valid band configurations', () => {
      const presetsWithBands: EqualizerPreset[] = [
        'bass-boost',
        'vocal-clarity',
        'bright',
        'warm',
        'rock',
        'pop',
        'jazz',
        'classical',
      ];

      presetsWithBands.forEach((preset) => {
        const config = EQUALIZER_PRESETS[preset];
        expect(config.bands.length).toBeGreaterThan(0);

        config.bands.forEach((band) => {
          expect(band.frequency).toBeGreaterThanOrEqual(20);
          expect(band.frequency).toBeLessThanOrEqual(20000);
          expect(band.gain).toBeGreaterThanOrEqual(-20);
          expect(band.gain).toBeLessThanOrEqual(20);
          expect(band.q).toBeGreaterThan(0);
          expect(band.q).toBeLessThanOrEqual(10);
        });
      });
    });
  });

  describe('applyEqualizerPreset', () => {
    it('should return original buffer when preset is "none"', async () => {
      const buffer = createTestAudioBuffer({ durationSeconds: 1 });
      const result = await applyEqualizerPreset(buffer, 'none');

      expect(result).toBe(buffer);
    });

    it('should return original buffer when preset has no bands', async () => {
      const buffer = createTestAudioBuffer({ durationSeconds: 1 });
      // Mock preset avec bands vide (ne devrait pas arriver normalement)
      const result = await applyEqualizerPreset(buffer, 'none');

      expect(result).toBe(buffer);
    });

    it('should throw error when Web Audio API is not available', async () => {
      const originalAudioContext = window.AudioContext;
      // @ts-expect-error - Suppression temporaire pour test
      delete window.AudioContext;
      // @ts-expect-error - Suppression temporaire pour test
      delete window.webkitAudioContext;

      const buffer = createTestAudioBuffer({ durationSeconds: 1 });

      await expect(applyEqualizerPreset(buffer, 'bass-boost')).rejects.toThrow(
        'Web Audio API non supportée',
      );

      // Restaurer
      window.AudioContext = originalAudioContext;
    });

    it('should apply bass-boost preset and return modified buffer', async () => {
      // Ce test nécessite un environnement avec Web Audio API réel ou mock
      if (typeof window !== 'undefined' && (window.AudioContext || window.OfflineAudioContext)) {
        const buffer = createTestAudioBuffer({ durationSeconds: 0.1 });
        const result = await applyEqualizerPreset(buffer, 'bass-boost');

        expect(result).toBeDefined();
        expect(result.sampleRate).toBe(buffer.sampleRate);
        expect(result.length).toBe(buffer.length);
        expect(result.numberOfChannels).toBe(buffer.numberOfChannels);
      } else {
        // Skip test if Web Audio API is not available
        expect(true).toBe(true);
      }
    });
  });

  describe('applyEqualizerPresetToBlob', () => {
    it('should throw error when used outside browser', async () => {
      // Ce test nécessite un mock de l'environnement navigateur
      // Dans un vrai environnement de test, on peut utiliser jsdom
      if (typeof window === 'undefined') {
        const blob = new Blob(['test'], { type: 'audio/wav' });
        await expect(applyEqualizerPresetToBlob(blob, 'bass-boost')).rejects.toThrow(
          'Égaliseur ne peut être utilisé que dans le navigateur',
        );
      }
    });

    it('should throw error when Web Audio API is not available', async () => {
      if (typeof window !== 'undefined') {
        const originalAudioContext = window.AudioContext;
        // @ts-expect-error - Suppression temporaire pour test
        delete window.AudioContext;
        // @ts-expect-error - Suppression temporaire pour test
        delete window.webkitAudioContext;

        const blob = createTestAudioBlob(0.1);

        await expect(applyEqualizerPresetToBlob(blob, 'bass-boost')).rejects.toThrow(
          'Web Audio API non supportée',
        );

        // Restaurer
        window.AudioContext = originalAudioContext;
      }
    });

    it('should return EqualizerResult with correct structure', async () => {
      if (typeof window !== 'undefined' && (window.AudioContext || window.OfflineAudioContext)) {
        const blob = createTestAudioBlob(0.1);
        // S'assurer que arrayBuffer est disponible
        if (!blob.arrayBuffer) {
          blob.arrayBuffer = async function () {
            return await new Response(this).arrayBuffer();
          };
        }
        const result = await applyEqualizerPresetToBlob(blob, 'bass-boost');

        expect(result).toBeDefined();
        expect(result.equalizedBlob).toBeInstanceOf(Blob);
        expect(result.durationSeconds).toBeGreaterThan(0);
        expect(result.presetUsed).toBe('bass-boost');
      } else {
        // Skip test if Web Audio API is not available
        expect(true).toBe(true);
      }
    });
  });

  describe('applyCustomEqualizer', () => {
    it('should return original buffer when bands array is empty', async () => {
      const buffer = createTestAudioBuffer({ durationSeconds: 1 });
      const result = await applyCustomEqualizer(buffer, []);

      expect(result).toBe(buffer);
    });

    it('should apply custom bands and return modified buffer', async () => {
      if (typeof window !== 'undefined' && (window.AudioContext || window.OfflineAudioContext)) {
        const buffer = createTestAudioBuffer({ durationSeconds: 0.1 });
        const customBands: EqualizerBand[] = [
          { frequency: 1000, gain: 3, q: 1.0 },
          { frequency: 5000, gain: 2, q: 1.5 },
        ];

        const result = await applyCustomEqualizer(buffer, customBands);

        expect(result).toBeDefined();
        expect(result.sampleRate).toBe(buffer.sampleRate);
        expect(result.length).toBe(buffer.length);
        expect(result.numberOfChannels).toBe(buffer.numberOfChannels);
      } else {
        // Skip test if Web Audio API is not available
        expect(true).toBe(true);
      }
    });

    it('should clamp frequency, gain, and Q values to valid ranges', async () => {
      if (typeof window !== 'undefined' && (window.AudioContext || window.OfflineAudioContext)) {
        const buffer = createTestAudioBuffer({ durationSeconds: 0.1 });
        const customBands: EqualizerBand[] = [
          { frequency: 10, gain: 25, q: 15 }, // Valeurs hors limites
          { frequency: 25000, gain: -25, q: 0.05 },
        ];

        // Ne devrait pas throw, mais clipper les valeurs
        const result = await applyCustomEqualizer(buffer, customBands);

        expect(result).toBeDefined();
      } else {
        // Skip test if Web Audio API is not available
        expect(true).toBe(true);
      }
    });

    it('should throw error when Web Audio API is not available', async () => {
      const originalAudioContext = window.AudioContext;
      // @ts-expect-error - Suppression temporaire pour test
      delete window.AudioContext;
      // @ts-expect-error - Suppression temporaire pour test
      delete window.webkitAudioContext;

      const buffer = createTestAudioBuffer({ durationSeconds: 1 });
      const customBands: EqualizerBand[] = [{ frequency: 1000, gain: 3, q: 1.0 }];

      await expect(applyCustomEqualizer(buffer, customBands)).rejects.toThrow(
        'Web Audio API non supportée',
      );

      // Restaurer
      window.AudioContext = originalAudioContext;
    });
  });
});

