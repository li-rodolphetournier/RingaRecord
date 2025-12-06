import { Capacitor } from '@capacitor/core';

/**
 * Service pour détecter et utiliser les fonctionnalités Capacitor
 */
export class CapacitorService {
  /**
   * Vérifie si l'application tourne dans Capacitor
   */
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Retourne la plateforme actuelle
   */
  static getPlatform(): 'web' | 'ios' | 'android' {
    return Capacitor.getPlatform() as 'web' | 'ios' | 'android';
  }

  /**
   * Vérifie si on est sur Android
   */
  static isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  /**
   * Vérifie si on est sur iOS
   */
  static isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  /**
   * Vérifie si on est sur le web
   */
  static isWeb(): boolean {
    return Capacitor.getPlatform() === 'web';
  }
}

