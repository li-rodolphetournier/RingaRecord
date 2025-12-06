import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilesystemService } from './filesystem.service';
import { CapacitorService } from './capacitor.service';

// Mock Capacitor
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
    stat: vi.fn(),
    getUri: vi.fn(),
  },
  Directory: {
    Data: 'DATA',
    Documents: 'DOCUMENTS',
    Cache: 'CACHE',
  },
  Encoding: {
    UTF8: 'utf8',
  },
}));

// Mock CapacitorService
vi.mock('./capacitor.service', () => ({
  CapacitorService: {
    isNative: vi.fn(),
  },
}));

describe('FilesystemService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL et URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('writeFile', () => {
    it('devrait écrire un fichier sur plateforme native', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      vi.mocked(Filesystem.writeFile).mockResolvedValue(undefined);

      const blob = new Blob(['test'], { type: 'audio/mpeg' });
      await FilesystemService.writeFile({
        path: 'test.mp3',
        data: blob,
      });

      expect(Filesystem.writeFile).toHaveBeenCalled();
    });

    it('devrait télécharger un fichier sur le web', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(false);
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      
      const mockLink = {
        click: mockClick,
        href: '',
        download: '',
        style: { display: '' },
      };
      
      document.createElement = vi.fn(() => mockLink) as typeof document.createElement;
      
      // Mock document.body correctement
      const originalBody = document.body;
      Object.defineProperty(document, 'body', {
        value: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
        },
        writable: true,
        configurable: true,
      });

      const blob = new Blob(['test'], { type: 'audio/mpeg' });
      await FilesystemService.writeFile({
        path: 'test.mp3',
        data: blob,
      });

      expect(mockClick).toHaveBeenCalled();
      
      // Restaurer document.body
      Object.defineProperty(document, 'body', {
        value: originalBody,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('readFile', () => {
    it('devrait lire un fichier sur plateforme native', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      vi.mocked(Filesystem.readFile).mockResolvedValue({ data: 'test content' } as { data: string });

      const result = await FilesystemService.readFile({
        path: 'test.txt',
      });

      expect(result.data).toBe('test content');
      expect(Filesystem.readFile).toHaveBeenCalled();
    });

    it('devrait lire un fichier sur le web', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(false);
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue('web content'),
      } as Response);

      const result = await FilesystemService.readFile({
        path: 'test.txt',
      });

      expect(result.data).toBe('web content');
    });
  });

  describe('deleteFile', () => {
    it('devrait supprimer un fichier sur plateforme native', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      vi.mocked(Filesystem.deleteFile).mockResolvedValue(undefined);

      await FilesystemService.deleteFile('test.txt');

      expect(Filesystem.deleteFile).toHaveBeenCalledWith({
        path: 'test.txt',
        directory: Directory.Data,
      });
    });
  });

  describe('fileExists', () => {
    it('devrait retourner true si le fichier existe sur plateforme native', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      vi.mocked(Filesystem.stat).mockResolvedValue({} as { type: string; size: number; mtime: number; uri: string });

      const result = await FilesystemService.fileExists('test.txt');

      expect(result).toBe(true);
    });

    it('devrait retourner false si le fichier n\'existe pas sur plateforme native', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      vi.mocked(Filesystem.stat).mockRejectedValue(new Error('File not found'));

      const result = await FilesystemService.fileExists('test.txt');

      expect(result).toBe(false);
    });
  });

  describe('saveAudioFile', () => {
    it('devrait sauvegarder un fichier audio', async () => {
      vi.mocked(CapacitorService.isNative).mockReturnValue(true);
      vi.mocked(Filesystem.writeFile).mockResolvedValue(undefined);

      const blob = new Blob(['audio'], { type: 'audio/mpeg' });
      await FilesystemService.saveAudioFile(blob, 'ringtone.mp3');

      expect(Filesystem.writeFile).toHaveBeenCalled();
    });
  });
});

