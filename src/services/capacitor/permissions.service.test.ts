import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionsService } from './permissions.service';
import { CapacitorService } from './capacitor.service';


// Mock CapacitorService
vi.mock('./capacitor.service', () => ({
  CapacitorService: {
    isNative: vi.fn(),
  },
}));

describe('PermissionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('request', () => {
    it('devrait demander une permission native quand on est sur une plateforme native', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      const mockGetUserMedia = vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
      global.navigator.mediaDevices = {
        getUserMedia: mockGetUserMedia,
      } as MediaDevices;

      const result = await PermissionsService.request('microphone');

      expect(result).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('devrait demander une permission web quand on est sur le web', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(false);
      const mockGetUserMedia = vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
      global.navigator.mediaDevices = {
        getUserMedia: mockGetUserMedia,
      } as MediaDevices;

      const result = await PermissionsService.request('microphone');

      expect(result).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('devrait retourner false en cas d\'erreur', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
      global.navigator.mediaDevices = {
        getUserMedia: mockGetUserMedia,
      } as MediaDevices;

      const result = await PermissionsService.request('microphone');

      expect(result).toBe(false);
    });
  });

  describe('check', () => {
    it('devrait vérifier une permission native', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      const mockEnumerateDevices = vi.fn().mockResolvedValue([
        { kind: 'audioinput', label: 'Microphone' },
      ]);
      global.navigator.mediaDevices = {
        enumerateDevices: mockEnumerateDevices,
      } as MediaDevices;

      const result = await PermissionsService.check('microphone');

      expect(result.granted).toBe(true);
      expect(result.denied).toBe(false);
      expect(mockEnumerateDevices).toHaveBeenCalled();
    });

    it('devrait vérifier une permission web', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(false);
      const mockEnumerateDevices = vi.fn().mockResolvedValue([
        { kind: 'audioinput', label: 'Microphone' },
      ]);
      global.navigator.mediaDevices = {
        enumerateDevices: mockEnumerateDevices,
      } as MediaDevices;

      const result = await PermissionsService.check('microphone');

      expect(result.granted).toBe(true);
      expect(mockEnumerateDevices).toHaveBeenCalled();
    });
  });

  describe('requestMicrophone', () => {
    it('devrait être une méthode de convenance pour request("microphone")', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      const mockGetUserMedia = vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
      global.navigator.mediaDevices = {
        getUserMedia: mockGetUserMedia,
      } as MediaDevices;

      await PermissionsService.requestMicrophone();

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });
  });

  describe('checkMicrophone', () => {
    it('devrait être une méthode de convenance pour check("microphone")', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      const mockEnumerateDevices = vi.fn().mockResolvedValue([
        { kind: 'audioinput', label: 'Microphone' },
      ]);
      global.navigator.mediaDevices = {
        enumerateDevices: mockEnumerateDevices,
      } as MediaDevices;

      await PermissionsService.checkMicrophone();

      expect(mockEnumerateDevices).toHaveBeenCalled();
    });
  });
});

