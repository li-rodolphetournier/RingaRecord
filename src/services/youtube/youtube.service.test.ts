import { describe, it, expect } from 'vitest';
import {
  extractYouTubeVideoId,
  parseYouTubeUrl,
  buildYouTubeEmbedUrl,
} from './youtube.service';

describe('YouTubeService', () => {
  describe('extractYouTubeVideoId', () => {
    it('devrait extraire l\'ID depuis une URL standard YouTube', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('devrait extraire l\'ID depuis une URL youtu.be', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('devrait extraire l\'ID depuis une URL embed', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('devrait extraire l\'ID depuis une URL mobile YouTube', () => {
      const url = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('devrait extraire l\'ID depuis un ID direct', () => {
      const id = 'dQw4w9WgXcQ';
      expect(extractYouTubeVideoId(id)).toBe('dQw4w9WgXcQ');
    });

    it('devrait retourner null pour une URL invalide', () => {
      expect(extractYouTubeVideoId('https://example.com')).toBeNull();
      expect(extractYouTubeVideoId('not a url')).toBeNull();
      expect(extractYouTubeVideoId('')).toBeNull();
    });

    it('devrait gérer les URLs avec des paramètres supplémentaires', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PLxxx';
      expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('devrait gérer les valeurs null et undefined', () => {
      expect(extractYouTubeVideoId(null as unknown as string)).toBeNull();
      expect(extractYouTubeVideoId(undefined as unknown as string)).toBeNull();
    });
  });

  describe('parseYouTubeUrl', () => {
    it('devrait parser une URL YouTube valide', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = parseYouTubeUrl(url);

      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('devrait retourner isValid=false pour une URL invalide', () => {
      const url = 'https://example.com';
      const result = parseYouTubeUrl(url);

      expect(result.isValid).toBe(false);
      expect(result.videoId).toBe('');
      expect(result.url).toBe(url);
    });

    it('devrait parser un ID direct', () => {
      const id = 'dQw4w9WgXcQ';
      const result = parseYouTubeUrl(id);

      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('buildYouTubeEmbedUrl', () => {
    it('devrait construire une URL d\'embed basique', () => {
      const videoId = 'dQw4w9WgXcQ';
      const url = buildYouTubeEmbedUrl(videoId);

      expect(url).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(url).toContain('enablejsapi=1');
      expect(url).toContain('origin=');
    });

    it('devrait inclure les paramètres d\'autoplay', () => {
      const videoId = 'dQw4w9WgXcQ';
      const url = buildYouTubeEmbedUrl(videoId, { autoplay: true });

      expect(url).toContain('autoplay=1');
    });

    it('devrait inclure les paramètres de contrôle', () => {
      const videoId = 'dQw4w9WgXcQ';
      const url = buildYouTubeEmbedUrl(videoId, { controls: false });

      expect(url).toContain('controls=0');
    });

    it('devrait inclure les paramètres de loop', () => {
      const videoId = 'dQw4w9WgXcQ';
      const url = buildYouTubeEmbedUrl(videoId, { loop: true });

      expect(url).toContain('loop=1');
    });

    it('devrait inclure les paramètres de mute', () => {
      const videoId = 'dQw4w9WgXcQ';
      const url = buildYouTubeEmbedUrl(videoId, { mute: true });

      expect(url).toContain('mute=1');
    });

    it('devrait inclure les paramètres de start et end', () => {
      const videoId = 'dQw4w9WgXcQ';
      const url = buildYouTubeEmbedUrl(videoId, { start: 10, end: 30 });

      expect(url).toContain('start=10');
      expect(url).toContain('end=30');
    });

    it('devrait inclure tous les paramètres', () => {
      const videoId = 'dQw4w9WgXcQ';
      const url = buildYouTubeEmbedUrl(videoId, {
        autoplay: true,
        controls: false,
        loop: true,
        mute: true,
        start: 5,
        end: 20,
      });

      expect(url).toContain('autoplay=1');
      expect(url).toContain('controls=0');
      expect(url).toContain('loop=1');
      expect(url).toContain('mute=1');
      expect(url).toContain('start=5');
      expect(url).toContain('end=20');
    });
  });
});

