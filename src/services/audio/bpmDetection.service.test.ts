import { describe, it, expect } from 'vitest';
import { detectBPMFromAudioBuffer } from './bpmDetection.service';

const createClickTrackBuffer = (params: {
  bpm: number;
  durationSeconds: number;
  sampleRate?: number;
}) => {
  const { bpm, durationSeconds, sampleRate = 44100 } = params;

  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const bufferData = new Float32Array(totalSamples);

  const secondsPerBeat = 60 / bpm;
  const samplesPerBeat = Math.floor(secondsPerBeat * sampleRate);

  // Crée des impulsions brèves aux positions de beat.
  for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += samplesPerBeat) {
    const end = Math.min(sampleIndex + 200, totalSamples); // impulsion de ~200 samples
    for (let i = sampleIndex; i < end; i++) {
      // Impulsion décroissante simple
      const t = (i - sampleIndex) / 200;
      bufferData[i] = 1 - t;
    }
  }

  const fakeAudioBuffer: AudioBuffer = {
    sampleRate,
    length: totalSamples,
    duration: durationSeconds,
    numberOfChannels: 1,
    getChannelData: () => bufferData,
    // Les méthodes suivantes ne sont pas utilisées par detectBPMFromAudioBuffer,
    // mais doivent exister pour satisfaire le type AudioBuffer au runtime.
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;

  return fakeAudioBuffer;
};

describe('bpmDetection.service - detectBPMFromAudioBuffer', () => {
  it('detects a BPM proche de la valeur cible sur un click track synthétique', () => {
    const targetBPM = 120;
    const buffer = createClickTrackBuffer({
      bpm: targetBPM,
      durationSeconds: 10,
    });

    const result = detectBPMFromAudioBuffer(buffer, {
      minBPM: 60,
      maxBPM: 180,
    });

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.method).toBe('autocorrelation');
    expect(result.bpm).toBeGreaterThan(0);

    const diff = Math.abs(result.bpm - targetBPM);
    // On tolère une petite marge d'erreur.
    expect(diff).toBeLessThanOrEqual(5);
  });

  it('returns low confidence for very short audio', () => {
    const shortBuffer: AudioBuffer = {
      sampleRate: 44100,
      length: 1000,
      duration: 0.02,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(1000),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as unknown as AudioBuffer;

    const result = detectBPMFromAudioBuffer(shortBuffer, {
      minBPM: 60,
      maxBPM: 180,
    });

    expect(result.confidence).toBe(0);
  });

  it('throws on invalid BPM range', () => {
    const buffer = createClickTrackBuffer({
      bpm: 100,
      durationSeconds: 5,
    });

    expect(() =>
      detectBPMFromAudioBuffer(buffer, {
        minBPM: 0,
        maxBPM: 0,
      }),
    ).toThrowError();
  });
});


