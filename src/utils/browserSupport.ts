/**
 * Détection du support navigateur pour les fonctionnalités audio
 */

export type RecordingMode = 'microphone' | 'system';

export interface BrowserSupport {
  microphone: boolean;
  systemAudio: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isNative: boolean; // Capacitor natif
  browserName: string;
}

/**
 * Détecte si on est sur un appareil mobile
 */
const detectMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';
  
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
};

/**
 * Détecte si on est sur iOS
 */
const detectIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';
  
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
};

/**
 * Détecte si on est sur Android
 */
const detectAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';
  
  return /android/i.test(userAgent.toLowerCase());
};

/**
 * Détecte le nom du navigateur
 */
const detectBrowser = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = navigator.userAgent || '';
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  
  return 'unknown';
};

/**
 * Détecte le support du microphone (getUserMedia)
 */
const detectMicrophoneSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
};

/**
 * Détecte si on est dans une application Capacitor native
 */
const detectCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Capacitor expose un objet Capacitor sur window
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform()) {
    return true;
  }
  
  // Vérification alternative : user agent ou présence de plugins Capacitor
  const userAgent = navigator.userAgent || '';
  if (userAgent.includes('CapacitorHttp')) {
    return true;
  }
  
  return false;
};

/**
 * Détecte le support de la capture audio système (getDisplayMedia)
 * 
 * Note: Sur mobile (iOS/Android), le support est très limité:
 * - iOS Safari: Pas de support natif
 * - Android Chrome: Support partiel (nécessite Chrome 74+)
 * - Desktop: Support variable selon navigateur
 * - Capacitor natif: Pas de support (getDisplayMedia n'existe pas dans WebView)
 */
const detectSystemAudioSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Sur mobile natif (Capacitor), getDisplayMedia n'existe pas
  if (detectCapacitorNative()) {
    return false; // Désactivé sur mobile natif
  }
  
  // Vérifier si getDisplayMedia existe
  const hasGetDisplayMedia = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getDisplayMedia &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  );
  
  if (!hasGetDisplayMedia) return false;
  
  // Sur iOS, getDisplayMedia n'est généralement pas supporté pour l'audio système
  if (detectIOS()) {
    // iOS 14.3+ peut avoir un support limité, mais pas fiable
    return false; // Désactivé par défaut sur iOS
  }
  
  // Sur Android, support partiel (Chrome 74+) - UNIQUEMENT dans navigateur, pas Capacitor
  if (detectAndroid() && !detectCapacitorNative()) {
    // Chrome Android dans navigateur peut supporter getDisplayMedia pour les onglets
    // Mais PAS pour les applications natives
    const browser = detectBrowser();
    // Note: Même dans Chrome Android, ne fonctionne que pour les onglets du navigateur
    // Pas pour les applications natives comme YouTube app
    return browser === 'Chrome' || browser === 'Edge';
  }
  
  // Sur Android natif (Capacitor), pas de support
  if (detectAndroid() && detectCapacitorNative()) {
    return false;
  }
  
  // Desktop: support généralement bon sur Chrome, Firefox, Edge
  return true;
};

/**
 * Obtient les informations de support du navigateur
 */
export const getBrowserSupport = (): BrowserSupport => {
  const isMobile = detectMobile();
  const isIOS = detectIOS();
  const isAndroid = detectAndroid();
  const isNative = detectCapacitorNative();
  
  return {
    microphone: detectMicrophoneSupport(),
    systemAudio: detectSystemAudioSupport(),
    isMobile,
    isIOS,
    isAndroid,
    isNative,
    browserName: detectBrowser(),
  };
};

/**
 * Vérifie si un mode d'enregistrement est supporté
 */
export const isRecordingModeSupported = (mode: RecordingMode): boolean => {
  const support = getBrowserSupport();
  
  if (mode === 'microphone') {
    return support.microphone;
  }
  
  if (mode === 'system') {
    return support.systemAudio;
  }
  
  return false;
};

/**
 * Obtient un message d'aide pour le mode système selon le navigateur
 */
export const getSystemAudioHelpMessage = (): string => {
  const support = getBrowserSupport();
  
  // Message pour mobile natif (Capacitor)
  if (support.isNative) {
    return '⚠️ La capture audio système n\'est pas disponible sur les applications mobiles natives (Android/iOS). Utilisez le mode microphone pour enregistrer.';
  }
  
  if (support.isIOS) {
    return '⚠️ La capture audio système n\'est pas disponible sur iOS Safari. Utilisez le mode microphone.';
  }
  
  if (support.isAndroid) {
    if (support.systemAudio) {
      return '💡 Sur Android, vous devrez peut-être sélectionner un onglet spécifique lors de la capture.';
    }
    return '⚠️ La capture audio système nécessite Chrome Android récent. Utilisez le mode microphone.';
  }
  
  if (support.systemAudio) {
    return '💡 Le navigateur vous demandera de partager l\'audio d\'un onglet ou d\'une application.';
  }
  
  return '⚠️ Votre navigateur ne supporte pas la capture audio système. Utilisez le mode microphone.';
};

