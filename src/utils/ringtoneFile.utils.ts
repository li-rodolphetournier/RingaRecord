/**
 * Utilitaires pour la création et la manipulation de fichiers de sonneries
 */

import { MAX_RINGTONE_DURATION_SECONDS, MIN_RINGTONE_DURATION_SECONDS } from './ringtoneConstants';

/**
 * Télécharge un blob depuis une URL
 * @param url - L'URL à télécharger
 * @param errorMessage - Message d'erreur personnalisé
 * @returns Le blob téléchargé
 * @throws Error si le téléchargement échoue
 */
export async function fetchBlobFromUrl(url: string, errorMessage?: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      errorMessage || `Erreur lors du téléchargement (${response.status}: ${response.statusText})`,
    );
  }
  return response.blob();
}

/**
 * Sanitise un titre pour en faire un nom de fichier valide
 * @param title - Le titre à sanitizer
 * @returns Le titre sanitizé
 */
export function sanitizeTitle(title: string): string {
  return title.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone';
}

/**
 * Clampe une durée entre les limites autorisées pour une sonnerie
 * @param duration - La durée en secondes
 * @param min - Durée minimale (défaut: MIN_RINGTONE_DURATION_SECONDS)
 * @param max - Durée maximale (défaut: MAX_RINGTONE_DURATION_SECONDS)
 * @returns La durée clamptée et arrondie
 */
export function clampRingtoneDuration(
  duration: number,
  min: number = MIN_RINGTONE_DURATION_SECONDS,
  max: number = MAX_RINGTONE_DURATION_SECONDS,
): number {
  if (!Number.isFinite(duration) || duration < min) {
    return min;
  }
  return Math.round(Math.min(duration, max));
}

/**
 * Crée un objet File à partir d'un Blob audio pour une sonnerie
 * @param blob - Le blob audio
 * @param title - Le titre de la sonnerie
 * @param format - Le format audio (wav, mp3, etc.)
 * @param mimeType - Le type MIME (optionnel, sera déduit si non fourni)
 * @returns Un objet File prêt à être uploadé
 */
export function createRingtoneFile(
  blob: Blob,
  title: string,
  format: string,
  mimeType?: string,
): File {
  const sanitizedTitle = sanitizeTitle(title);
  const filename = `${sanitizedTitle}.${format}`;
  const safeMimeType = mimeType || blob.type || 'audio/wav';

  return new File([blob], filename, { type: safeMimeType });
}

/**
 * Options pour créer une nouvelle sonnerie à partir d'un blob
 */
export interface CreateRingtoneFromBlobOptions {
  blob: Blob;
  title: string;
  format: string;
  duration: number;
  mimeType?: string;
}

/**
 * Prépare les données pour créer une sonnerie à partir d'un blob
 * @param options - Les options de création
 * @returns Un objet avec le File, le titre et la durée préparés
 */
export function prepareRingtoneFromBlob(options: CreateRingtoneFromBlobOptions): {
  file: File;
  title: string;
  duration: number;
} {
  const { blob, title, format, duration, mimeType } = options;

  const file = createRingtoneFile(blob, title, format, mimeType);
  const clampedDuration = clampRingtoneDuration(duration);

  return {
    file,
    title,
    duration: clampedDuration,
  };
}

