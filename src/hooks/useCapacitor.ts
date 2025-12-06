import { useEffect, useMemo } from 'react';
import { CapacitorService } from '../services/capacitor/capacitor.service';
import { App } from '@capacitor/app';
import type { AppState } from '@capacitor/app';

/**
 * Hook pour utiliser les fonctionnalités Capacitor
 */
export const useCapacitor = () => {
  const isNative = useMemo(() => CapacitorService.isNative(), []);
  const platform = useMemo(() => CapacitorService.getPlatform(), []);

  useEffect(() => {
    if (isNative) {
      // Écouter les changements d'état de l'app
      const listener = App.addListener('appStateChange', (state: AppState) => {
        console.log('App state changed:', state.isActive);
      });

      return () => {
        void listener.then((l) => l.remove());
      };
    }
  }, [isNative]);

  return {
    isNative,
    platform,
    isAndroid: CapacitorService.isAndroid(),
    isIOS: CapacitorService.isIOS(),
    isWeb: CapacitorService.isWeb(),
  };
};

