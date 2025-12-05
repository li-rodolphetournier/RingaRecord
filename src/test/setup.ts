// Setup file for Vitest tests
// This file runs before each test file

import { vi } from 'vitest';

// Mock Web Audio API
if (typeof window !== 'undefined') {
  // Mock OfflineAudioContext
  if (!window.OfflineAudioContext) {
    class MockOfflineAudioContext {
      numberOfChannels: number;
      length: number;
      sampleRate: number;
      destination: AudioDestinationNode;
      private _renderedBuffer: AudioBuffer | null = null;

      constructor(numberOfChannels: number, length: number, sampleRate: number) {
        this.numberOfChannels = numberOfChannels;
        this.length = length;
        this.sampleRate = sampleRate;
        this.destination = {
          channelCount: numberOfChannels,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers',
          numberOfInputs: 1,
          numberOfOutputs: 0,
        } as AudioDestinationNode;
      }

      createBufferSource(): AudioBufferSourceNode {
        return {
          buffer: null,
          playbackRate: { value: 1 },
          detune: { value: 0 },
          loop: false,
          loopStart: 0,
          loopEnd: 0,
          start: vi.fn(),
          stop: vi.fn(),
          connect: vi.fn(),
          disconnect: vi.fn(),
          numberOfInputs: 0,
          numberOfOutputs: 1,
          channelCount: 2,
          channelCountMode: 'max',
          channelInterpretation: 'speakers',
          context: this as unknown as BaseAudioContext,
        } as unknown as AudioBufferSourceNode;
      }

      createBiquadFilter(): BiquadFilterNode {
        return {
          type: 'peaking',
          frequency: { value: 0 },
          detune: { value: 0 },
          Q: { value: 0 },
          gain: { value: 0 },
          connect: vi.fn(),
          disconnect: vi.fn(),
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 2,
          channelCountMode: 'max',
          channelInterpretation: 'speakers',
          context: this as unknown as BaseAudioContext,
        } as unknown as BiquadFilterNode;
      }

      async startRendering(): Promise<AudioBuffer> {
        if (this._renderedBuffer) {
          return this._renderedBuffer;
        }

        // Créer un buffer vide avec les mêmes caractéristiques
        const buffer = {
          sampleRate: this.sampleRate,
          length: this.length,
          duration: this.length / this.sampleRate,
          numberOfChannels: this.numberOfChannels,
          getChannelData: () => {
            return new Float32Array(this.length);
          },
          copyFromChannel: vi.fn(),
          copyToChannel: vi.fn(),
        } as unknown as AudioBuffer;

        this._renderedBuffer = buffer;
        return buffer;
      }
    }

    // @ts-expect-error - Mock pour tests
    window.OfflineAudioContext = MockOfflineAudioContext;
  }

  // Mock AudioContext pour decodeAudioData et autres méthodes
  if (!window.AudioContext) {
    class MockAudioContext {
      sampleRate = 44100;

      async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
        // Créer un AudioBuffer mock à partir du blob
        // On suppose que c'est un WAV avec les paramètres standards
        const sampleRate = 44100;
        const numberOfChannels = 1;
        const length = Math.floor(arrayBuffer.byteLength / 2); // Approximation pour 16-bit PCM

        return {
          sampleRate,
          length,
          duration: length / sampleRate,
          numberOfChannels,
          getChannelData: () => {
            return new Float32Array(length);
          },
          copyFromChannel: vi.fn(),
          copyToChannel: vi.fn(),
        } as unknown as AudioBuffer;
      }

      createAnalyser(): AnalyserNode {
        const fftSize = 2048;
        const frequencyBinCount = fftSize / 2;
        
        return {
          fftSize,
          frequencyBinCount,
          minDecibels: -100,
          maxDecibels: -30,
          smoothingTimeConstant: 0.8,
          getFloatFrequencyData: vi.fn((array: Float32Array) => {
            // Simuler des données de fréquence pour les tests
            // Générer des valeurs qui couvrent toutes les bandes de fréquence
            // pour garantir une normalisation correcte
            for (let i = 0; i < array.length; i++) {
              // Générer des valeurs entre -80 et -40 dB pour avoir une énergie significative
              // et garantir que toutes les bandes ont des valeurs
              array[i] = -80 + Math.random() * 40;
            }
          }),
          getByteFrequencyData: vi.fn(),
          getFloatTimeDomainData: vi.fn(),
          getByteTimeDomainData: vi.fn(),
          connect: vi.fn(),
          disconnect: vi.fn(),
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 2,
          channelCountMode: 'max',
          channelInterpretation: 'speakers',
          context: this as unknown as BaseAudioContext,
        } as unknown as AnalyserNode;
      }

      createBufferSource(): AudioBufferSourceNode {
        return {
          buffer: null,
          playbackRate: { value: 1 },
          detune: { value: 0 },
          loop: false,
          loopStart: 0,
          loopEnd: 0,
          start: vi.fn(),
          stop: vi.fn(),
          connect: vi.fn(),
          disconnect: vi.fn(),
          numberOfInputs: 0,
          numberOfOutputs: 1,
          channelCount: 2,
          channelCountMode: 'max',
          channelInterpretation: 'speakers',
          context: this as unknown as BaseAudioContext,
        } as unknown as AudioBufferSourceNode;
      }

      close = vi.fn();
    }

    // @ts-expect-error - Mock pour tests
    window.AudioContext = MockAudioContext;
  }

  // S'assurer que Blob.arrayBuffer() est disponible
  if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read blob as ArrayBuffer'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    };
  }

  // Mock window.matchMedia pour les tests de thème
  if (!window.matchMedia) {
    window.matchMedia = vi.fn((query: string) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList;
    });
  }
}

