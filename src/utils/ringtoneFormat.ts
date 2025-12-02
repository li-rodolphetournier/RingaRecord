import { getBrowserSupport } from './browserSupport';
import type { RingtoneFormat } from '../services/audio/ringtoneConverter.service';

/**
 * Détermine le format de sonnerie recommandé selon la plateforme
 */
export function getRecommendedRingtoneFormat(): RingtoneFormat {
  const support = getBrowserSupport();

  if (support.isIOS) {
    return 'm4r';
  }

  if (support.isAndroid) {
    return 'mp3';
  }

  // Desktop: par défaut MP3 (mais on proposera les deux)
  return 'mp3';
}

/**
 * Retourne tous les formats disponibles selon la plateforme
 */
export function getAvailableRingtoneFormats(): RingtoneFormat[] {
  const support = getBrowserSupport();

  if (support.isIOS) {
    return ['m4r'];
  }

  if (support.isAndroid) {
    return ['mp3', 'm4a'];
  }

  // Desktop: proposer les deux formats
  return ['mp3', 'm4r'];
}

/**
 * Retourne le label d'affichage pour un format
 */
export function getFormatLabel(format: RingtoneFormat): string {
  const labels: Record<RingtoneFormat, string> = {
    m4r: 'M4R (iOS)',
    mp3: 'MP3 (Android/Universal)',
    m4a: 'M4A (Android)',
  };
  return labels[format] || format.toUpperCase();
}

