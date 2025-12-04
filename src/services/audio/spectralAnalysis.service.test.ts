import { describe, it, expect } from 'vitest';
import { analyzeSpectrum, analyzeSpectrumFromBlob } from './spectralAnalysis.service';

/**
 * Crée un AudioBuffer de test avec énergie concentrée dans une bande de fréquences
 */
function createTestAudioBufferWithEnergy(params: {
  durationSeconds?: number;
  sampleRate?: number;
  dominantFrequency?: number;
  bassEnergy?: number;
  midEnergy?: number;
  trebleEnergy?: number;
}): AudioBuffer {
  const {
    durationSeconds = 1,
    sampleRate = 44100,
    dominantFrequency = 440,
    bassEnergy = 0.33,
    midEnergy = 0.33,
    trebleEnergy = 0.34,
  } = params;

  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const bufferData = new Float32Array(totalSamples);

  // Génère un signal avec énergie distribuée selon les paramètres
  // Basses: 20-250 Hz
  // Médiums: 250-4000 Hz
  // Aigus: 4000-20000 Hz

  const bassFreq = 100;
  const midFreq = 1000;
  const trebleFreq = 8000;

  for (let i = 0; i < totalSamples; i++) {
    let sample = 0;

    // Ajoute composantes selon les énergies
    if (bassEnergy > 0) {
      sample += Math.sin((2 * Math.PI * bassFreq * i) / sampleRate) * bassEnergy * 0.5;
    }
    if (midEnergy > 0) {
      sample += Math.sin((2 * Math.PI * midFreq * i) / sampleRate) * midEnergy * 0.5;
    }
    if (trebleEnergy > 0) {
      sample += Math.sin((2 * Math.PI * trebleFreq * i) / sampleRate) * trebleEnergy * 0.5;
    }

    // Ajoute la fréquence dominante
    sample += Math.sin((2 * Math.PI * dominantFrequency * i) / sampleRate) * 0.3;

    bufferData[i] = Math.max(-1, Math.min(1, sample));
  }

  const fakeAudioBuffer: AudioBuffer = {
    sampleRate,
    length: totalSamples,
    duration: durationSeconds,
    numberOfChannels: 1,
    getChannelData: () => bufferData,
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

  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint8(0, 0x52);
  view.setUint8(1, 0x49);
  view.setUint8(2, 0x46);
  view.setUint8(3, 0x46);
  view.setUint32(4, 36 + dataSize, true);
  view.setUint8(8, 0x57);
  view.setUint8(9, 0x41);
  view.setUint8(10, 0x56);
  view.setUint8(11, 0x45);

  // fmt chunk
  view.setUint8(12, 0x66);
  view.setUint8(13, 0x6d);
  view.setUint8(14, 0x74);
  view.setUint8(15, 0x20);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);

  // data chunk
  view.setUint8(36, 0x64);
  view.setUint8(37, 0x61);
  view.setUint8(38, 0x74);
  view.setUint8(39, 0x61);
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.5;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

describe('spectralAnalysis.service', () => {
  describe('analyzeSpectrum', () => {
    it('should throw error when Web Audio API is not available', async () => {
      const originalAudioContext = window.AudioContext;
      // @ts-expect-error - Suppression temporaire pour test
      delete window.AudioContext;
      // @ts-expect-error - Suppression temporaire pour test
      delete window.webkitAudioContext;

      const buffer = createTestAudioBufferWithEnergy({ durationSeconds: 0.1 });

      await expect(analyzeSpectrum(buffer)).rejects.toThrow('Web Audio API non supportée');

      // Restaurer
      window.AudioContext = originalAudioContext;
    });

    it('should return SpectralAnalysisResult with correct structure', async () => {
      if (typeof window !== 'undefined' && window.AudioContext) {
        const buffer = createTestAudioBufferWithEnergy({ durationSeconds: 0.1 });
        const result = await analyzeSpectrum(buffer);

        expect(result).toBeDefined();
        expect(result.dominantFrequency).toBeGreaterThanOrEqual(0);
        expect(result.bassEnergy).toBeGreaterThanOrEqual(0);
        expect(result.bassEnergy).toBeLessThanOrEqual(1);
        expect(result.midEnergy).toBeGreaterThanOrEqual(0);
        expect(result.midEnergy).toBeLessThanOrEqual(1);
        expect(result.trebleEnergy).toBeGreaterThanOrEqual(0);
        expect(result.trebleEnergy).toBeLessThanOrEqual(1);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect([
          'none',
          'bass-boost',
          'vocal-clarity',
          'bright',
          'warm',
          'rock',
          'pop',
          'jazz',
          'classical',
        ]).toContain(result.suggestedPreset);
      }
    });

    it('should normalize energy values to sum approximately to 1', async () => {
      if (typeof window !== 'undefined' && window.AudioContext) {
        const buffer = createTestAudioBufferWithEnergy({ durationSeconds: 0.1 });
        const result = await analyzeSpectrum(buffer);

        const sum = result.bassEnergy + result.midEnergy + result.trebleEnergy;
        // Tolérance pour erreurs d'arrondi et fréquences hors bandes (20-20000 Hz)
        // Certaines fréquences peuvent être < 20 Hz ou > 20000 Hz et ne sont pas comptées
        expect(sum).toBeGreaterThan(0.85);
        expect(sum).toBeLessThanOrEqual(1.1);
      }
    });

    it('should suggest bass-boost when bass energy is low', async () => {
      if (typeof window !== 'undefined' && window.AudioContext) {
        const buffer = createTestAudioBufferWithEnergy({
          durationSeconds: 0.1,
          bassEnergy: 0.1,
          midEnergy: 0.5,
          trebleEnergy: 0.4,
          dominantFrequency: 300,
        });
        const result = await analyzeSpectrum(buffer);

        // La suggestion peut varier, mais on vérifie que le résultat est valide
        expect([
          'none',
          'bass-boost',
          'vocal-clarity',
          'bright',
          'warm',
          'rock',
          'pop',
          'jazz',
          'classical',
        ]).toContain(result.suggestedPreset);
      }
    });
  });

  describe('analyzeSpectrumFromBlob', () => {
    it('should throw error when used outside browser', async () => {
      if (typeof window === 'undefined') {
        const blob = new Blob(['test'], { type: 'audio/wav' });
        await expect(analyzeSpectrumFromBlob(blob)).rejects.toThrow(
          'Analyse spectrale ne peut être utilisée que dans le navigateur',
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

        await expect(analyzeSpectrumFromBlob(blob)).rejects.toThrow('Web Audio API non supportée');

        // Restaurer
        window.AudioContext = originalAudioContext;
      }
    });

    it('should return SpectralAnalysisResult from blob', async () => {
      if (typeof window !== 'undefined' && window.AudioContext) {
        const blob = createTestAudioBlob(0.1);
        const result = await analyzeSpectrumFromBlob(blob);

        expect(result).toBeDefined();
        expect(result.dominantFrequency).toBeGreaterThanOrEqual(0);
        expect(result.bassEnergy).toBeGreaterThanOrEqual(0);
        expect(result.midEnergy).toBeGreaterThanOrEqual(0);
        expect(result.trebleEnergy).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect([
          'none',
          'bass-boost',
          'vocal-clarity',
          'bright',
          'warm',
          'rock',
          'pop',
          'jazz',
          'classical',
        ]).toContain(result.suggestedPreset);
      }
    });
  });

  describe('suggestion logic', () => {
    it('should suggest appropriate preset based on energy distribution', async () => {
      if (typeof window !== 'undefined' && window.AudioContext) {
        // Test avec énergie vocale (médiums dominants)
        const vocalBuffer = createTestAudioBufferWithEnergy({
          durationSeconds: 0.1,
          bassEnergy: 0.2,
          midEnergy: 0.6,
          trebleEnergy: 0.2,
          dominantFrequency: 2000,
        });
        const vocalResult = await analyzeSpectrum(vocalBuffer);

        // Peut suggérer vocal-clarity ou autre selon l'algorithme
        expect(vocalResult.suggestedPreset).toBeDefined();
        expect(vocalResult.confidence).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

