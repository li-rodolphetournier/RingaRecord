/**
 * Service pour gérer l'intégration YouTube
 * Permet d'extraire l'ID d'une vidéo depuis une URL YouTube
 * et de valider les URLs YouTube
 */

export interface YouTubeVideoInfo {
  videoId: string;
  url: string;
  embedUrl?: string;
  isValid: boolean;
}

/**
 * Patterns d'URL YouTube supportés
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/,
];

/**
 * Extrait l'ID d'une vidéo YouTube depuis une URL ou un ID direct
 * @param input - URL YouTube ou ID de vidéo
 * @returns L'ID de la vidéo ou null si invalide
 */
export const extractYouTubeVideoId = (input: string): string | null => {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmedInput = input.trim();

  // Essayer chaque pattern
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmedInput.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Valide une URL YouTube et retourne les informations de la vidéo
 * @param input - URL YouTube ou ID de vidéo
 * @returns Informations sur la vidéo YouTube
 */
export const parseYouTubeUrl = (input: string): YouTubeVideoInfo => {
  const videoId = extractYouTubeVideoId(input);

  if (!videoId) {
    return {
      videoId: '',
      url: input,
      isValid: false,
    };
  }

  // Construire l'URL canonique
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return {
    videoId,
    url: canonicalUrl,
    embedUrl,
    isValid: true,
  };
};

/**
 * Construit l'URL d'embed YouTube avec des paramètres optionnels
 * @param videoId - ID de la vidéo YouTube
 * @param options - Options pour l'embed (autoplay, controls, etc.)
 * @returns URL d'embed complète
 */
export const buildYouTubeEmbedUrl = (
  videoId: string,
  options: {
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    mute?: boolean;
    start?: number;
    end?: number;
  } = {}
): string => {
  const {
    autoplay = false,
    controls = true,
    loop = false,
    mute = false,
    start,
    end,
  } = options;

  const params = new URLSearchParams();

  if (autoplay) params.append('autoplay', '1');
  if (!controls) params.append('controls', '0');
  if (loop) params.append('loop', '1');
  if (mute) params.append('mute', '1');
  if (start) params.append('start', start.toString());
  if (end) params.append('end', end.toString());

  // Ajouter enablejsapi pour permettre l'interaction avec l'API
  params.append('enablejsapi', '1');
  params.append('origin', window.location.origin);

  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? `?${queryString}` : ''}`;
};

