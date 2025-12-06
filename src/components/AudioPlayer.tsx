import { memo } from 'react';
import { motion } from 'framer-motion';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

interface AudioPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

export const AudioPlayer = memo(({ src, title, className = '' }: AudioPlayerProps) => {
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    hasError,
    togglePlayPause,
    handleSeek,
    handleVolumeChange,
    formatTime,
  } = useAudioPlayer(src);

  return (
    <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-3 ${className}`}>
      {title && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {title}
        </p>
      )}
      
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        crossOrigin="anonymous"
        onError={(e) => {
          console.warn('Erreur de chargement audio:', src, e);
        }}
      />
      {hasError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
          Erreur de chargement audio. Vérifiez votre connexion.
        </p>
      )}

      <div className="flex items-center gap-3 mb-3">
        <motion.button
          onClick={togglePlayPause}
          className="flex-shrink-0 w-14 h-14 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center touch-manipulation shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-7 h-7 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </motion.button>

        <div className="flex-1 min-w-0">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer touch-manipulation slider"
          />
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 dark:text-gray-400 w-10 flex-shrink-0">
          {Math.round(volume * 100)}%
        </span>
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.707a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
        </svg>
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer touch-manipulation slider"
          />
        </div>
      </div>
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

