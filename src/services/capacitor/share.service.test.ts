import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Share } from '@capacitor/share';
import { ShareService } from './share.service';
import { CapacitorService } from './capacitor.service';

// Mock Capacitor
vi.mock('@capacitor/share', () => ({
  Share: {
    share: vi.fn(),
  },
}));

// Mock CapacitorService
vi.mock('./capacitor.service', () => ({
  CapacitorService: {
    isNative: vi.fn(),
  },
}));

describe('ShareService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('share', () => {
    it('devrait partager sur plateforme native', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      vi.mocked(Share.share).mockResolvedValue(undefined);

      const result = await ShareService.share({
        title: 'Test',
        text: 'Test text',
        url: 'https://example.com',
      });

      expect(result).toBe(true);
      expect(Share.share).toHaveBeenCalledWith({
        title: 'Test',
        text: 'Test text',
        url: 'https://example.com',
      });
    });

    it('devrait partager sur le web avec Web Share API', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(false);
      const mockShare = vi.fn().mockResolvedValue(undefined);
      global.navigator.share = mockShare as typeof navigator.share;

      const result = await ShareService.share({
        title: 'Test',
        text: 'Test text',
        url: 'https://example.com',
      });

      expect(result).toBe(true);
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test',
        text: 'Test text',
        url: 'https://example.com',
      });
    });

    it('devrait copier dans le presse-papiers si Web Share n\'est pas disponible', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(false);
      delete (global.navigator as { share?: unknown }).share;
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      global.navigator.clipboard = {
        writeText: mockWriteText,
      } as Clipboard;

      const result = await ShareService.share({
        url: 'https://example.com',
      });

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('https://example.com');
    });

    it('devrait retourner false si l\'utilisateur annule', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      vi.mocked(Share.share).mockRejectedValue(new Error('User cancelled'));

      const result = await ShareService.share({
        title: 'Test',
      });

      expect(result).toBe(false);
    });
  });

  describe('shareRingtone', () => {
    it('devrait partager une sonnerie', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      vi.mocked(Share.share).mockResolvedValue(undefined);

      await ShareService.shareRingtone('Ma sonnerie', 'https://example.com/ringtone.mp3');

      expect(Share.share).toHaveBeenCalledWith({
        title: 'Découvrez la sonnerie "Ma sonnerie"',
        text: 'Sonnerie créée avec RingaRecord: Ma sonnerie',
        url: 'https://example.com/ringtone.mp3',
      });
    });
  });

  describe('shareAudioFile', () => {
    it('devrait partager un fichier audio', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(false);
      const mockShare = vi.fn().mockResolvedValue(undefined);
      global.navigator.share = mockShare as typeof navigator.share;

      const file = new File(['audio'], 'ringtone.mp3', { type: 'audio/mpeg' });
      await ShareService.shareAudioFile(file, 'Ma sonnerie');

      expect(mockShare).toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('devrait retourner true sur plateforme native', () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);

      expect(ShareService.isAvailable()).toBe(true);
    });

    it('devrait retourner true si Web Share est disponible', () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(false);
      global.navigator.share = vi.fn() as typeof navigator.share;

      expect(ShareService.isAvailable()).toBe(true);
    });

    it('devrait retourner false si Web Share n\'est pas disponible', () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(false);
      delete (global.navigator as { share?: unknown }).share;

      expect(ShareService.isAvailable()).toBe(false);
    });
  });
});

