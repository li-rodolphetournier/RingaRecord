import { Share } from '@capacitor/share';
import { CapacitorService } from './capacitor.service';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

/**
 * Service unifié pour le partage sur web et natif
 */
export class ShareService {
  /**
   * Partage du contenu
   */
  static async share(options: ShareOptions): Promise<boolean> {
    if (CapacitorService.isNative()) {
      return this.shareNative(options);
    }
    return this.shareWeb(options);
  }

  /**
   * Partage sur plateforme native
   */
  private static async shareNative(options: ShareOptions): Promise<boolean> {
    try {
      // Capacitor Share ne supporte que title, text et url
      // Pour les fichiers, il faudrait utiliser un plugin supplémentaire
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch (error) {
      // L'utilisateur a peut-être annulé le partage
      if ((error as Error).message.includes('cancel')) {
        return false;
      }
      console.error('Error sharing on native platform:', error);
      return false;
    }
  }

  /**
   * Partage sur le web
   */
  private static async shareWeb(options: ShareOptions): Promise<boolean> {
    try {
      // Utiliser l'API Web Share si disponible
      if (navigator.share) {
        const shareData: ShareData = {};

        if (options.title) {
          shareData.title = options.title;
        }

        if (options.text) {
          shareData.text = options.text;
        }

        if (options.url) {
          shareData.url = options.url;
        }

        if (options.files && options.files.length > 0) {
          // Web Share API v2 supporte les fichiers
          if ('canShare' in navigator && navigator.canShare({ files: options.files })) {
            shareData.files = options.files;
          } else {
            // Fallback : partager l'URL seulement
            console.warn('File sharing not supported, sharing URL instead');
          }
        }

        await navigator.share(shareData);
        return true;
      }

      // Fallback : copier l'URL dans le presse-papiers
      if (options.url) {
        await navigator.clipboard.writeText(options.url);
        return true;
      }

      return false;
    } catch (error) {
      // L'utilisateur a peut-être annulé le partage
      if ((error as Error).name === 'AbortError') {
        return false;
      }
      console.error('Error sharing on web:', error);
      return false;
    }
  }

  /**
   * Partage une sonnerie (méthode de convenance)
   */
  static async shareRingtone(title: string, url: string, description?: string): Promise<boolean> {
    return this.share({
      title: `Découvrez la sonnerie "${title}"`,
      text: description || `Sonnerie créée avec RingaRecord: ${title}`,
      url,
    });
  }

  /**
   * Partage un fichier audio
   */
  static async shareAudioFile(file: File, title?: string): Promise<boolean> {
    return this.share({
      title: title || 'Ma sonnerie',
      text: 'Sonnerie créée avec RingaRecord',
      files: [file],
    });
  }

  /**
   * Vérifie si le partage est disponible
   */
  static isAvailable(): boolean {
    if (CapacitorService.isNative()) {
      return true; // Capacitor Share est toujours disponible
    }
    return typeof navigator.share === 'function';
  }
}

