import { describe, it, expect } from 'vitest';
import {
  clampRingtoneDuration,
  sanitizeTitle,
  createRingtoneFile,
  prepareRingtoneFromBlob,
} from './ringtoneFile.utils';
import {
  MAX_RINGTONE_DURATION_SECONDS,
  MIN_RINGTONE_DURATION_SECONDS,
} from './ringtoneConstants';

describe('ringtoneFile.utils', () => {
  describe('clampRingtoneDuration', () => {
    it('should clamp duration to minimum if below minimum', () => {
      expect(clampRingtoneDuration(0)).toBe(MIN_RINGTONE_DURATION_SECONDS);
      expect(clampRingtoneDuration(-10)).toBe(MIN_RINGTONE_DURATION_SECONDS);
    });

    it('should clamp duration to maximum if above maximum', () => {
      expect(clampRingtoneDuration(200)).toBe(MAX_RINGTONE_DURATION_SECONDS);
      expect(clampRingtoneDuration(1000)).toBe(MAX_RINGTONE_DURATION_SECONDS);
    });

    it('should return rounded duration if within bounds', () => {
      expect(clampRingtoneDuration(30)).toBe(30);
      expect(clampRingtoneDuration(30.7)).toBe(31);
      expect(clampRingtoneDuration(30.3)).toBe(30);
    });

    it('should handle custom min and max', () => {
      expect(clampRingtoneDuration(0, 5, 10)).toBe(5);
      expect(clampRingtoneDuration(15, 5, 10)).toBe(10);
      expect(clampRingtoneDuration(7, 5, 10)).toBe(7);
    });

    it('should handle non-finite values', () => {
      // Non-finite values (NaN, Infinity, -Infinity) retournent min
      expect(clampRingtoneDuration(NaN)).toBe(MIN_RINGTONE_DURATION_SECONDS);
      expect(clampRingtoneDuration(Infinity)).toBe(MIN_RINGTONE_DURATION_SECONDS);
      expect(clampRingtoneDuration(-Infinity)).toBe(MIN_RINGTONE_DURATION_SECONDS);
    });
  });

  describe('sanitizeTitle', () => {
    it('should sanitize title with special characters', () => {
      expect(sanitizeTitle('My Ringtone!')).toBe('My_Ringtone_');
      expect(sanitizeTitle('Test@#$%Ringtone')).toBe('Test_Ringtone');
      expect(sanitizeTitle('Hello World 123')).toBe('Hello_World_123');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeTitle('MyRingtone123')).toBe('MyRingtone123');
      expect(sanitizeTitle('ringtone-test_123')).toBe('ringtone-test_123');
    });

    it('should trim whitespace', () => {
      expect(sanitizeTitle('  My Ringtone  ')).toBe('My_Ringtone');
    });

    it('should return default for empty title', () => {
      expect(sanitizeTitle('')).toBe('ringtone');
      expect(sanitizeTitle('   ')).toBe('ringtone');
    });
  });

  describe('createRingtoneFile', () => {
    it('should create a File with correct properties', () => {
      const blob = new Blob(['test'], { type: 'audio/wav' });
      const file = createRingtoneFile(blob, 'My Ringtone', 'wav');

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('My_Ringtone.wav');
      expect(file.type).toBe('audio/wav');
    });

    it('should use custom mime type if provided', () => {
      const blob = new Blob(['test'], { type: 'audio/mpeg' });
      const file = createRingtoneFile(blob, 'Test', 'mp3', 'audio/mpeg');

      expect(file.type).toBe('audio/mpeg');
    });

    it('should sanitize title in filename', () => {
      const blob = new Blob(['test'], { type: 'audio/wav' });
      const file = createRingtoneFile(blob, 'Test@#$Ringtone', 'wav');

      expect(file.name).toBe('Test_Ringtone.wav');
    });
  });

  describe('prepareRingtoneFromBlob', () => {
    it('should prepare ringtone data correctly', () => {
      const blob = new Blob(['test'], { type: 'audio/wav' });
      const result = prepareRingtoneFromBlob({
        blob,
        title: 'My Ringtone',
        format: 'wav',
        duration: 30.5,
      });

      expect(result.file).toBeInstanceOf(File);
      expect(result.title).toBe('My Ringtone');
      expect(result.duration).toBe(31); // Rounded
    });

    it('should clamp duration to valid range', () => {
      const blob = new Blob(['test'], { type: 'audio/wav' });
      const resultShort = prepareRingtoneFromBlob({
        blob,
        title: 'Short',
        format: 'wav',
        duration: 0.5,
      });
      expect(resultShort.duration).toBe(MIN_RINGTONE_DURATION_SECONDS);

      const resultLong = prepareRingtoneFromBlob({
        blob,
        title: 'Long',
        format: 'wav',
        duration: 200,
      });
      expect(resultLong.duration).toBe(MAX_RINGTONE_DURATION_SECONDS);
    });
  });
});

