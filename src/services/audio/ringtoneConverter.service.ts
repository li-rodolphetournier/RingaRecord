/**
 * Service de conversion audio pour formats de sonneries (M4R iOS, MP3 Android)
 */

export type RingtoneFormat = 'm4r' | 'mp3' | 'm4a';

export interface ConversionOptions {
  /** Format de sortie souhaité */
  format: RingtoneFormat;
  /** Qualité audio (0-1, par défaut 0.9) */
  quality?: number;
}

/**
 * Convertit un AudioBuffer en Blob au format spécifié
 */
export async function convertAudioBufferToFormat(
  audioBuffer: AudioBuffer,
  options: ConversionOptions,
): Promise<Blob> {
  const { format, quality = 0.9 } = options;

  switch (format) {
    case 'm4r':
    case 'm4a':
      // M4R est essentiellement un M4A (AAC) avec extension .m4r
      // Pour iOS, on utilise MediaRecorder avec codec AAC si disponible
      return convertToM4A(audioBuffer, quality);
    case 'mp3':
      // MP3 nécessite lamejs (à installer)
      return convertToMP3(audioBuffer, quality);
    default:
      throw new Error(`Format non supporté: ${format}`);
  }
}

/**
 * Convertit un Blob audio en AudioBuffer puis en format cible
 */
export async function convertBlobToFormat(
  blob: Blob,
  options: ConversionOptions,
): Promise<Blob> {
  const audioContext = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  audioContext.close();

  return convertAudioBufferToFormat(audioBuffer, options);
}

/**
 * Convertit un AudioBuffer en M4A (AAC) - utilisé pour M4R iOS
 * Note: Cette implémentation utilise MediaRecorder si disponible,
 * sinon retourne un WAV comme fallback (à améliorer avec ffmpeg.wasm)
 */
async function convertToM4A(
  audioBuffer: AudioBuffer,
  quality: number,
): Promise<Blob> {
  // Vérifier si MediaRecorder supporte AAC/M4A
  const m4aMimeTypes = [
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4;codecs=mp4a.40.5',
    'audio/mp4',
  ];

  let supportedMimeType: string | null = null;
  for (const mimeType of m4aMimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      supportedMimeType = mimeType;
      break;
    }
  }

  if (supportedMimeType) {
    // Utiliser MediaRecorder pour encoder en AAC/M4A
    return encodeWithMediaRecorder(audioBuffer, supportedMimeType, quality);
  }

  // Fallback: encoder en WAV (iOS peut parfois accepter WAV, mais M4R est préférable)
  // TODO: Implémenter conversion WAV -> M4A avec ffmpeg.wasm pour meilleure compatibilité
  return encodeToWAV(audioBuffer);
}

/**
 * Convertit un AudioBuffer en MP3
 * Nécessite lamejs (npm install lamejs @types/lamejs)
 */
async function convertToMP3(
  audioBuffer: AudioBuffer,
  quality: number,
): Promise<Blob> {
  // Vérifier si lamejs est disponible
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lamejs = await import('lamejs');
    const mp3encoder = new lamejs.Mp3Encoder(
      audioBuffer.numberOfChannels,
      audioBuffer.sampleRate,
      Math.round(quality * 128), // Bitrate: 0-1 -> 64-128 kbps
    );

    const samples = [];
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      samples.push(audioBuffer.getChannelData(channel));
    }

    const sampleBlockSize = 1152;
    const mp3Data: Int8Array[] = [];

    for (let i = 0; i < samples[0].length; i += sampleBlockSize) {
      const left = samples[0].subarray(i, i + sampleBlockSize);
      const right =
        audioBuffer.numberOfChannels > 1
          ? samples[1].subarray(i, i + sampleBlockSize)
          : left;

      const mp3buf = mp3encoder.encodeBuffer(left, right);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    // Calculer la taille totale
    const totalLength = mp3Data.reduce((sum, arr) => sum + arr.length, 0);
    const mergedArray = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of mp3Data) {
      mergedArray.set(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength), offset);
      offset += arr.length;
    }

    return new Blob([mergedArray], { type: 'audio/mpeg' });
  } catch (error) {
    console.warn('lamejs non disponible, fallback vers WAV:', error);
    // Fallback vers WAV si lamejs n'est pas installé
    return encodeToWAV(audioBuffer);
  }
}

/**
 * Encode un AudioBuffer avec MediaRecorder (pour M4A/AAC)
 */
async function encodeWithMediaRecorder(
  audioBuffer: AudioBuffer,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const audioContext = new AudioContext({ sampleRate: audioBuffer.sampleRate });

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    source.start(0);

    const stream = destination.stream;
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: Math.round(quality * 128000),
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      audioContext.close();
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    mediaRecorder.onerror = () => {
      audioContext.close();
      reject(new Error('Erreur MediaRecorder lors de la conversion'));
    };

    mediaRecorder.start();
    const duration = (audioBuffer.length / audioBuffer.sampleRate) * 1000;
    setTimeout(() => {
      mediaRecorder.stop();
    }, duration + 100);
  });
}

/**
 * Encode un AudioBuffer en WAV (fallback)
 */
function encodeToWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = audioBuffer.getChannelData(channel)[i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

