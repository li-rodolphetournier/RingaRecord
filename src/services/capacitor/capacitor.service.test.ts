import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { CapacitorService } from './capacitor.service';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

describe('CapacitorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isNative', () => {
    it('devrait retourner true quand on est sur une plateforme native', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      expect(CapacitorService.isNative()).toBe(true);
    });

    it('devrait retourner false quand on est sur le web', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      expect(CapacitorService.isNative()).toBe(false);
    });
  });

  describe('getPlatform', () => {
    it('devrait retourner "web" quand on est sur le web', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web' as any);
      expect(CapacitorService.getPlatform()).toBe('web');
    });

    it('devrait retourner "android" quand on est sur Android', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android' as any);
      expect(CapacitorService.getPlatform()).toBe('android');
    });

    it('devrait retourner "ios" quand on est sur iOS', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios' as any);
      expect(CapacitorService.getPlatform()).toBe('ios');
    });
  });

  describe('isAndroid', () => {
    it('devrait retourner true quand on est sur Android', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android' as any);
      expect(CapacitorService.isAndroid()).toBe(true);
    });

    it('devrait retourner false quand on n\'est pas sur Android', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web' as any);
      expect(CapacitorService.isAndroid()).toBe(false);
    });
  });

  describe('isIOS', () => {
    it('devrait retourner true quand on est sur iOS', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios' as any);
      expect(CapacitorService.isIOS()).toBe(true);
    });

    it('devrait retourner false quand on n\'est pas sur iOS', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web' as any);
      expect(CapacitorService.isIOS()).toBe(false);
    });
  });

  describe('isWeb', () => {
    it('devrait retourner true quand on est sur le web', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web' as any);
      expect(CapacitorService.isWeb()).toBe(true);
    });

    it('devrait retourner false quand on n\'est pas sur le web', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android' as any);
      expect(CapacitorService.isWeb()).toBe(false);
    });
  });
});

