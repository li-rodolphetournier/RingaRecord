import { useState, useRef, useCallback, useEffect } from 'react';
import type { RecordingMode } from '../utils/browserSupport';

interface RecordingFormat {
  mimeType: string;
  extension: string;
}

interface UseAudioRecorderOptions {
  gain?: number; // Gain multiplier (1.0 = normal, 2.0 = double, etc.)
  mode?: RecordingMode; // Mode d'enregistrement: 'microphone' ou 'system'
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordingMimeType: string;
  fileExtension: string;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  getAudioBlob: () => Blob | null;
  error: string | null;
}

const FALLBACK_FORMAT: RecordingFormat = {
  mimeType: 'audio/webm;codecs=opus',
  extension: 'webm',
};

const MIME_PREFERENCES: RecordingFormat[] = [
  { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'm4a' },
  { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
  FALLBACK_FORMAT,
];

const getSupportedFormat = (): RecordingFormat => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return FALLBACK_FORMAT;
  }

  for (const option of MIME_PREFERENCES) {
    try {
      if (MediaRecorder.isTypeSupported(option.mimeType)) {
        return option;
      }
    } catch {
      // Certains navigateurs peuvent lever une erreur sur isTypeSupported
      continue;
    }
  }

  return FALLBACK_FORMAT;
};

export const useAudioRecorder = (options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn => {
  const { gain = 1.0, mode = 'microphone' } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingFormat, setRecordingFormat] = useState<RecordingFormat>(FALLBACK_FORMAT);
  
  // Utiliser un ref pour stocker le gain actuel (évite de recréer les callbacks)
  const gainRef = useRef<number>(gain);
  // Utiliser un ref pour stocker le mode actuel
  const modeRef = useRef<RecordingMode>(mode);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  // Mettre à jour les refs quand ils changent
  useEffect(() => {
    gainRef.current = gain;
  }, [gain]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const startDurationTimer = useCallback(() => {
    durationIntervalRef.current = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const currentMode = modeRef.current;
      let originalStream: MediaStream;
      
      // Choisir la méthode de capture selon le mode
      if (currentMode === 'system') {
        // Capture audio système (getDisplayMedia)
        // Note: Certains navigateurs nécessitent video: true même si on veut juste l'audio
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'browser', // Préférer l'onglet navigateur
            } as MediaTrackConstraints,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              suppressLocalAudioPlayback: false, // Important pour capturer le son système
            } as MediaTrackConstraints,
          });
          
          // Extraire uniquement les pistes audio
          const audioTracks = displayStream.getAudioTracks();
          if (audioTracks.length === 0) {
            throw new Error('Aucune piste audio disponible dans la capture. Assurez-vous de partager l\'audio.');
          }
          
          // Créer un nouveau stream avec uniquement l'audio
          originalStream = new MediaStream(audioTracks);
          
          // Arrêter les pistes vidéo si présentes (pour économiser les ressources)
          displayStream.getVideoTracks().forEach((track) => {
            track.stop();
          });
        } catch (displayError) {
          const errorMessage = displayError instanceof Error ? displayError.message : 'Erreur lors de la capture audio système';
          throw new Error(`Impossible de capturer l'audio système: ${errorMessage}. Essayez de sélectionner un onglet avec du son.`);
        }
      } else {
        // Capture microphone (getUserMedia)
        originalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      originalStreamRef.current = originalStream;

      let streamToUse = originalStream;

      // Utiliser le gain depuis le ref (toujours la valeur la plus récente)
      const currentGain = gainRef.current;
      
      // Si gain > 1.0, amplifier le signal avec Web Audio API
      if (currentGain > 1.0) {
        try {
          const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(originalStream);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = currentGain;
            gainNodeRef.current = gainNode;

            const destination = audioContext.createMediaStreamDestination();
            source.connect(gainNode);
            gainNode.connect(destination);

            streamToUse = destination.stream;
          }
        } catch (audioError) {
          console.warn('Web Audio API not available, using original stream:', audioError);
          // Fallback: utiliser le stream original si Web Audio échoue
        }
      }

      streamRef.current = streamToUse;

      const selectedFormat = getSupportedFormat();
      setRecordingFormat(selectedFormat);

      const recorderOptions = selectedFormat.mimeType
        ? { mimeType: selectedFormat.mimeType }
        : undefined;

      const mediaRecorder = recorderOptions
        ? new MediaRecorder(streamToUse, recorderOptions)
        : new MediaRecorder(streamToUse);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Arrêter le stream original
        if (originalStreamRef.current) {
          originalStreamRef.current.getTracks().forEach((track) => track.stop());
          originalStreamRef.current = null;
        }
        // Nettoyer AudioContext si utilisé
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(console.error);
          audioContextRef.current = null;
        }
        gainNodeRef.current = null;
        streamRef.current = null;
        stopDurationTimer();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startDurationTimer();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      console.error('Error starting recording:', err);
    }
  }, [startDurationTimer, stopDurationTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopDurationTimer();
    }
  }, [isRecording, stopDurationTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopDurationTimer();
    }
  }, [isRecording, isPaused, stopDurationTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startDurationTimer();
    }
  }, [isRecording, isPaused, startDurationTimer]);

  const getAudioBlob = useCallback((): Blob | null => {
    if (audioChunksRef.current.length === 0) {
      return null;
    }
    const mimeType = recordingFormat.mimeType || FALLBACK_FORMAT.mimeType;
    return new Blob(audioChunksRef.current, { type: mimeType });
  }, [recordingFormat.mimeType]);

  return {
    isRecording,
    isPaused,
    duration,
    recordingMimeType: recordingFormat.mimeType,
    fileExtension: recordingFormat.extension,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getAudioBlob,
    error,
  };
};

