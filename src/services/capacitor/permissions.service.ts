import { CapacitorService } from './capacitor.service';

export type PermissionType = 'microphone' | 'camera' | 'photos' | 'storage';

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

/**
 * Service unifié pour gérer les permissions sur web et natif
 */
export class PermissionsService {
  /**
   * Demande une permission
   */
  static async request(permission: PermissionType): Promise<boolean> {
    if (CapacitorService.isNative()) {
      return this.requestNative(permission);
    }
    return this.requestWeb(permission);
  }

  /**
   * Vérifie le statut d'une permission
   */
  static async check(permission: PermissionType): Promise<PermissionStatus> {
    if (CapacitorService.isNative()) {
      return this.checkNative(permission);
    }
    return this.checkWeb(permission);
  }

  /**
   * Demande une permission sur plateforme native
   * Note: Pour utiliser les permissions Capacitor, installer @capacitor/permissions
   * et utiliser Permissions.request() directement
   */
  private static async requestNative(permission: PermissionType): Promise<boolean> {
    try {
      // Sur natif, on peut utiliser les APIs natives directement
      // Pour microphone, on peut utiliser getUserMedia qui fonctionne aussi sur natif
      if (permission === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }
      
      if (permission === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }

      // Pour photos et storage, retourner true par défaut
      // (géré par les inputs file ou les APIs natives)
      return true;
    } catch (error) {
      console.error(`Error requesting permission ${permission}:`, error);
      return false;
    }
  }

  /**
   * Vérifie le statut d'une permission sur plateforme native
   */
  private static async checkNative(permission: PermissionType): Promise<PermissionStatus> {
    try {
      // Sur natif, on peut utiliser enumerateDevices pour vérifier les permissions
      if (permission === 'microphone' || permission === 'camera') {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasPermission = devices.some(
          (device) =>
            device.kind === (permission === 'microphone' ? 'audioinput' : 'videoinput') &&
            device.label !== '',
        );
        return {
          granted: hasPermission,
          denied: !hasPermission,
          prompt: !hasPermission,
        };
      }

      // Pour photos et storage, retourner granted par défaut
      return { granted: true, denied: false, prompt: false };
    } catch (error) {
      console.error(`Error checking permission ${permission}:`, error);
      return { granted: false, denied: true, prompt: false };
    }
  }

  /**
   * Demande une permission sur le web
   */
  private static async requestWeb(permission: PermissionType): Promise<boolean> {
    try {
      if (permission === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Libérer le stream immédiatement
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }

      if (permission === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }

      // Pour photos et storage, on ne peut pas vraiment demander sur le web
      // On retourne true par défaut car le navigateur gère cela via les inputs file
      return true;
    } catch (error) {
      console.error(`Error requesting permission ${permission}:`, error);
      return false;
    }
  }

  /**
   * Vérifie le statut d'une permission sur le web
   */
  private static async checkWeb(permission: PermissionType): Promise<PermissionStatus> {
    try {
      if (permission === 'microphone' || permission === 'camera') {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasPermission = devices.some(
          (device) =>
            device.kind === (permission === 'microphone' ? 'audioinput' : 'videoinput') &&
            device.label !== '',
        );
        return {
          granted: hasPermission,
          denied: !hasPermission,
          prompt: !hasPermission,
        };
      }

      // Pour photos et storage, on retourne granted par défaut
      return { granted: true, denied: false, prompt: false };
    } catch (error) {
      console.error(`Error checking permission ${permission}:`, error);
      return { granted: false, denied: true, prompt: false };
    }
  }


  /**
   * Demande la permission microphone (méthode de convenance)
   */
  static async requestMicrophone(): Promise<boolean> {
    return this.request('microphone');
  }

  /**
   * Vérifie la permission microphone (méthode de convenance)
   */
  static async checkMicrophone(): Promise<PermissionStatus> {
    return this.check('microphone');
  }
}

