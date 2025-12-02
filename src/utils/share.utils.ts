/**
 * Génère les URLs de partage pour différents réseaux sociaux
 */

export interface ShareOptions {
  url: string;
  title?: string;
  description?: string;
}

/**
 * Génère l'URL de partage Facebook
 */
export function getFacebookShareUrl(options: ShareOptions): string {
  const params = new URLSearchParams({
    u: options.url,
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Génère l'URL de partage Twitter/X
 */
export function getTwitterShareUrl(options: ShareOptions): string {
  const text = options.title || 'Découvrez cette sonnerie créée avec RingaRecord!';
  const params = new URLSearchParams({
    url: options.url,
    text: text,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Génère l'URL de partage WhatsApp
 */
export function getWhatsAppShareUrl(options: ShareOptions): string {
  const text = `${options.title || 'Découvrez cette sonnerie'} - ${options.url}`;
  const params = new URLSearchParams({
    text: text,
  });
  return `https://wa.me/?${params.toString()}`;
}

/**
 * Génère l'URL de partage LinkedIn
 */
export function getLinkedInShareUrl(options: ShareOptions): string {
  const params = new URLSearchParams({
    url: options.url,
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/**
 * Génère l'URL de partage par email
 */
export function getEmailShareUrl(options: ShareOptions): string {
  const subject = encodeURIComponent(options.title || 'Sonnerie créée avec RingaRecord');
  const body = encodeURIComponent(
    `${options.description || 'Découvrez cette sonnerie créée avec RingaRecord!'}\n\n${options.url}`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Copie l'URL dans le presse-papier
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback pour les navigateurs plus anciens
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Erreur lors de la copie:', error);
    return false;
  }
}

/**
 * Utilise l'API Web Share si disponible
 */
export async function shareNative(options: ShareOptions): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: options.title || 'Sonnerie RingaRecord',
      text: options.description || 'Découvrez cette sonnerie créée avec RingaRecord!',
      url: options.url,
    });
    return true;
  } catch (error) {
    // L'utilisateur a annulé le partage
    if (error instanceof Error && error.name === 'AbortError') {
      return false;
    }
    console.error('Erreur lors du partage natif:', error);
    return false;
  }
}

