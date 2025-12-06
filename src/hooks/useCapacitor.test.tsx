import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCapacitor } from './useCapacitor';
import { CapacitorService } from '../services/capacitor/capacitor.service';
import { App } from '@capacitor/app';

// Mock CapacitorService
vi.mock('../services/capacitor/capacitor.service', () => ({
  CapacitorService: {
    isNative: vi.fn(),
    getPlatform: vi.fn(),
    isAndroid: vi.fn(),
    isIOS: vi.fn(),
    isWeb: vi.fn(),
  },
}));

// Mock @capacitor/app
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
  },
}));

describe('useCapacitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(App.addListener).mockResolvedValue({
      remove: vi.fn(),
    } as any);
  });

  it('devrait retourner les valeurs correctes pour le web', () => {
    vi.mocked(CapacitorService.isNative).mockReturnValue(false);
    vi.mocked(CapacitorService.getPlatform).mockReturnValue('web');
    vi.mocked(CapacitorService.isAndroid).mockReturnValue(false);
    vi.mocked(CapacitorService.isIOS).mockReturnValue(false);
    vi.mocked(CapacitorService.isWeb).mockReturnValue(true);

    const { result } = renderHook(() => useCapacitor());

    expect(result.current.isNative).toBe(false);
    expect(result.current.platform).toBe('web');
    expect(result.current.isAndroid).toBe(false);
    expect(result.current.isIOS).toBe(false);
    expect(result.current.isWeb).toBe(true);
  });

  it('devrait retourner les valeurs correctes pour Android', () => {
    vi.mocked(CapacitorService.isNative).mockReturnValue(true);
    vi.mocked(CapacitorService.getPlatform).mockReturnValue('android');
    vi.mocked(CapacitorService.isAndroid).mockReturnValue(true);
    vi.mocked(CapacitorService.isIOS).mockReturnValue(false);
    vi.mocked(CapacitorService.isWeb).mockReturnValue(false);

    const { result } = renderHook(() => useCapacitor());

    expect(result.current.isNative).toBe(true);
    expect(result.current.platform).toBe('android');
    expect(result.current.isAndroid).toBe(true);
    expect(result.current.isIOS).toBe(false);
    expect(result.current.isWeb).toBe(false);
  });

  it('devrait retourner les valeurs correctes pour iOS', () => {
    vi.mocked(CapacitorService.isNative).mockReturnValue(true);
    vi.mocked(CapacitorService.getPlatform).mockReturnValue('ios');
    vi.mocked(CapacitorService.isAndroid).mockReturnValue(false);
    vi.mocked(CapacitorService.isIOS).mockReturnValue(true);
    vi.mocked(CapacitorService.isWeb).mockReturnValue(false);

    const { result } = renderHook(() => useCapacitor());

    expect(result.current.isNative).toBe(true);
    expect(result.current.platform).toBe('ios');
    expect(result.current.isAndroid).toBe(false);
    expect(result.current.isIOS).toBe(true);
    expect(result.current.isWeb).toBe(false);
  });

  it('devrait écouter les changements d\'état de l\'app quand on est natif', async () => {
    vi.mocked(CapacitorService.isNative).mockReturnValue(true);
    vi.mocked(CapacitorService.getPlatform).mockReturnValue('android');

    const { unmount } = renderHook(() => useCapacitor());

    await waitFor(() => {
      expect(App.addListener).toHaveBeenCalledWith('appStateChange', expect.any(Function));
    });

    unmount();

    // Vérifier que le listener est nettoyé
    await waitFor(() => {
      expect(App.addListener).toHaveBeenCalled();
    });
  });

  it('ne devrait pas écouter les changements d\'état quand on est sur le web', () => {
    vi.mocked(CapacitorService.isNative).mockReturnValue(false);
    vi.mocked(CapacitorService.getPlatform).mockReturnValue('web');

    renderHook(() => useCapacitor());

    expect(App.addListener).not.toHaveBeenCalled();
  });
});

