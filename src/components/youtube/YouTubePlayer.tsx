import { memo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { parseYouTubeUrl, buildYouTubeEmbedUrl, type YouTubeVideoInfo } from '../../services/youtube/youtube.service';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface YouTubePlayerProps {
  onVideoLoaded?: (videoInfo: YouTubeVideoInfo) => void;
  className?: string;
}

/**
 * Composant pour intégrer et lire des vidéos YouTube
 * Permet de charger une vidéo YouTube et de l'intégrer dans l'application
 * Une fois la vidéo chargée dans l'app, elle peut être capturée via getDisplayMedia
 */
export const YouTubePlayer = memo(({ onVideoLoaded, className = '' }: YouTubePlayerProps) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    setError(null);

    if (!url.trim()) {
      setVideoInfo(null);
      return;
    }

    const parsed = parseYouTubeUrl(url);
    if (parsed.isValid) {
      setVideoInfo(parsed);
      onVideoLoaded?.(parsed);
    } else {
      setError("URL YouTube invalide. Exemple: https://www.youtube.com/watch?v=VIDEO_ID");
      setVideoInfo(null);
    }
  };

  const handleLoadVideo = () => {
    if (!videoUrl.trim()) {
      setError('Veuillez entrer une URL YouTube');
      return;
    }

    const parsed = parseYouTubeUrl(videoUrl);
    if (parsed.isValid) {
      setVideoInfo(parsed);
      setError(null);
      onVideoLoaded?.(parsed);
    } else {
      setError("URL YouTube invalide. Exemple: https://www.youtube.com/watch?v=VIDEO_ID");
    }
  };

  // Construire l'URL d'embed
  const embedUrl = videoInfo?.videoId
    ? buildYouTubeEmbedUrl(videoInfo.videoId, {
        autoplay: false,
        controls: true,
        mute: false,
      })
    : null;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📺 Intégrer une vidéo YouTube
        </h3>
        <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
          Collez l'URL d'une vidéo YouTube ci-dessous. Une fois la vidéo chargée dans l'application,
          vous pourrez enregistrer son audio en utilisant le mode "Son système" et en sélectionnant
          l'onglet de cette application.
        </p>

        <div className="flex gap-2">
          <Input
            type="text"
            value={videoUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLoadVideo();
              }
            }}
          />
          <Button onClick={handleLoadVideo} variant="primary" className="min-h-[44px]">
            Charger
          </Button>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-600 dark:text-red-400 mt-2"
          >
            {error}
          </motion.p>
        )}

        {videoInfo?.isValid && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <p className="text-xs text-green-700 dark:text-green-300 mb-2">
              ✅ Vidéo chargée : {videoInfo.videoId}
            </p>
          </motion.div>
        )}
      </div>

      {/* Lecteur YouTube intégré */}
      {embedUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full"
          style={{ paddingBottom: '56.25%' }} // Ratio 16:9
        >
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
            style={{ minHeight: '200px' }}
          />
        </motion.div>
      )}

      {/* Avertissement légal */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
          ⚠️ Avertissement légal
        </h4>
        <p className="text-xs text-red-700 dark:text-red-300">
          L'enregistrement d'audio depuis YouTube peut violer les conditions d'utilisation de YouTube et les droits d'auteur.
          Cette fonctionnalité est fournie à des fins éducatives et de recherche uniquement.
          Vous êtes seul responsable de l'utilisation de cette fonctionnalité et de la conformité avec toutes les lois applicables.
          N'enregistrez que du contenu pour lequel vous avez les droits ou l'autorisation explicite.
        </p>
      </div>

      {/* Instructions pour l'enregistrement */}
      {videoInfo?.isValid && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
        >
          <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            🎙️ Comment enregistrer l'audio de cette vidéo :
          </h4>
          <ol className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
            <li>Assurez-vous que la vidéo est en cours de lecture</li>
            <li>Sélectionnez le mode "Son système" dans les contrôles d'enregistrement</li>
            <li>Cliquez sur "Démarrer" l'enregistrement</li>
            <li>Dans le sélecteur qui apparaît, choisissez l'onglet de cette application (RingaRecord)</li>
            <li>
              <strong>Important :</strong> Cochez "Partager l'audio" dans le sélecteur
            </li>
            <li>Cliquez sur "Partager" et l'enregistrement commencera</li>
          </ol>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 italic">
            ⚠️ Note : Cette fonctionnalité fonctionne sur desktop (Chrome, Firefox, Edge).
            Sur mobile natif, utilisez le mode microphone.
          </p>
        </motion.div>
      )}
    </div>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';

