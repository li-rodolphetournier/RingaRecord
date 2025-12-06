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
        // Vérifier si getDisplayMedia est disponible
        if (!navigator.mediaDevices?.getDisplayMedia) {
          // Sur mobile natif (Capacitor), getDisplayMedia n'existe généralement pas
          // Mais on peut essayer de donner un message d'erreur plus utile
          const isNative = typeof (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor !== 'undefined' &&
            (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
          
          if (isNative) {
            throw new Error(
              '⚠️ La capture audio système n\'est pas disponible dans l\'application native mobile.\n\n' +
              '💡 SOLUTIONS :\n\n' +
              '1. Utilisez le mode microphone pour enregistrer\n' +
              '2. Ouvrez l\'application dans Chrome Android (pas l\'app native) pour capturer les onglets\n' +
              '3. Utilisez la version web sur desktop pour capturer le son système complet\n\n' +
              'Note : Les applications natives (YouTube app, Spotify app, etc.) ne peuvent pas être capturées sur mobile.'
            );
          }
          
          throw new Error(
            'Votre navigateur ne supporte pas la capture audio système. ' +
            'Utilisez Chrome, Firefox ou Edge sur desktop, ou le mode microphone sur mobile.'
          );
        }
        
        // Note: Certains navigateurs nécessitent video: true même si on veut juste l'audio
        try {
          // Permettre la sélection d'onglet, fenêtre ou écran entier
          // Ne pas forcer 'browser' pour permettre la capture de Teams et autres applications
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              // Permettre onglet, fenêtre ou écran (pas de contrainte displaySurface)
              // Cela permet de capturer Teams et autres applications
            } as MediaTrackConstraints,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              suppressLocalAudioPlayback: false, // Important pour capturer le son système
            } as MediaTrackConstraints,
          });
          
          // Vérifier si l'utilisateur a bien coché "Partager l'audio" dans le sélecteur
          const audioTracks = displayStream.getAudioTracks();
          const videoTracks = displayStream.getVideoTracks();
          
          if (audioTracks.length === 0) {
            // Arrêter le stream si pas d'audio
            displayStream.getTracks().forEach((track) => track.stop());
            
            // Détecter si c'est une application externe (fenêtre) vs onglet navigateur
            const isExternalApp = videoTracks.length > 0 && 
              videoTracks.some(track => {
                const settings = track.getSettings();
                // Si displaySurface est 'window', c'est une application externe
                return settings.displaySurface === 'window';
              });
            
            let errorMessage = 'Aucune piste audio disponible.\n\n';
            
            if (isExternalApp) {
              // Application externe détectée (Teams desktop, etc.)
              errorMessage += '🔍 DIAGNOSTIC : Application externe détectée.\n\n';
              errorMessage += '✅ SOLUTION RECOMMANDÉE :\n';
              errorMessage += 'Les applications desktop (Teams, Discord, etc.) ne partagent souvent pas l\'audio via le navigateur.\n\n';
              errorMessage += '1. Ouvrez l\'application dans votre navigateur :\n';
              errorMessage += '   • Teams → https://teams.microsoft.com\n';
              errorMessage += '   • Discord → https://discord.com/app\n';
              errorMessage += '   • Autre → Utilisez la version web de l\'application\n\n';
              errorMessage += '2. Rejoignez l\'appel/réunion depuis le navigateur\n\n';
              errorMessage += '3. Dans RingaRecord, sélectionnez "Son système" et choisissez l\'onglet du navigateur\n\n';
              errorMessage += '4. ⚠️ COCHEZ "Partager l\'audio" dans le sélecteur (peut être en bas)\n\n';
            } else if (videoTracks.length > 0) {
              // Onglet navigateur mais pas d'audio
              errorMessage += '🔍 DIAGNOSTIC : Onglet sélectionné mais audio non partagé.\n\n';
              errorMessage += '✅ SOLUTIONS :\n\n';
              errorMessage += '1. ⚠️ IMPORTANT : Dans le sélecteur de partage, vous DEVEZ cocher la case "Partager l\'audio" ou "Share audio"\n';
              errorMessage += '   → Cette case peut être en BAS du sélecteur (faites défiler si nécessaire)\n';
              errorMessage += '   → Cochez-la AVANT de cliquer sur "Partager"\n\n';
              errorMessage += '2. Assurez-vous que l\'onglet diffuse du son :\n';
              errorMessage += '   → Un appel/réunion doit être en cours\n';
              errorMessage += '   → Ou une vidéo/musique doit être en lecture\n\n';
              errorMessage += '3. Si l\'option "Partager l\'audio" n\'apparaît pas :\n';
              errorMessage += '   → L\'onglet ne supporte peut-être pas le partage audio\n';
              errorMessage += '   → Essayez un autre onglet (YouTube, Spotify, etc.)\n\n';
            } else {
              // Aucune sélection
              errorMessage += 'Aucune source sélectionnée.\n\n';
              errorMessage += '💡 Sélectionnez un onglet, une fenêtre ou un écran qui diffuse du son.';
            }
            
            throw new Error(errorMessage);
          }
          
          // Vérifier que les pistes audio sont actives
          const activeAudioTracks = audioTracks.filter((track) => track.readyState === 'live');
          if (activeAudioTracks.length === 0) {
            displayStream.getTracks().forEach((track) => track.stop());
            throw new Error(
              'Les pistes audio ne sont pas actives. ' +
              'Assurez-vous que Teams diffuse du son et que vous avez coché "Partager l\'audio" dans le sélecteur.'
            );
          }
          
          // Créer un nouveau stream avec uniquement l'audio actif
          originalStream = new MediaStream(activeAudioTracks);
          
          // Arrêter les pistes vidéo si présentes (pour économiser les ressources)
          displayStream.getVideoTracks().forEach((track) => {
            track.stop();
          });
          
          // Surveiller si la piste audio se coupe (utilisateur arrête le partage)
          activeAudioTracks.forEach((track) => {
            track.onended = () => {
              console.warn('Piste audio système interrompue - l\'utilisateur a peut-être arrêté le partage');
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                setIsRecording(false);
                setIsPaused(false);
                stopDurationTimer();
                setError('Capture audio interrompue. Le partage d\'écran/audio a été arrêté.');
              }
            };
          });
        } catch (displayError) {
          const errorMessage = displayError instanceof Error ? displayError.message : 'Erreur lors de la capture audio système';
          
          // Vérifier si le message d'erreur indique une application externe
          const isExternalAppError = errorMessage.includes('Application externe détectée') || 
                                     errorMessage.includes('application desktop');
          
          if (isExternalAppError) {
            // Le message d'erreur contient déjà les instructions pour utiliser le navigateur
            throw new Error(errorMessage);
          }
          
          // Message d'erreur générique avec conseils
          throw new Error(
            `Impossible de capturer l'audio système: ${errorMessage}\n\n` +
            `💡 CONSEILS :\n\n` +
            `1. Si vous utilisez une APPLICATION DESKTOP (Teams, Discord, etc.) :\n` +
            `   → Ouvrez l'application dans votre navigateur\n` +
            `   → Teams : https://teams.microsoft.com\n` +
            `   → Discord : https://discord.com/app\n` +
            `   → Rejoignez l'appel depuis le navigateur, puis sélectionnez l'onglet\n\n` +
            `2. Si l'application est déjà dans le navigateur :\n` +
            `   → Sélectionnez l'onglet avec l'application\n` +
            `   → ⚠️ COCHEZ "Partager l'audio" dans le sélecteur (peut être en bas)\n` +
            `   → Assurez-vous qu'un appel/réunion est en cours ou qu'un son est diffusé\n\n` +
            `3. Si l'option "Partager l'audio" n'apparaît pas :\n` +
            `   → Essayez un autre onglet qui diffuse du son (YouTube, Spotify, etc.)\n` +
            `   → Ou utilisez le mode microphone pour capturer via votre micro`
          );
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

