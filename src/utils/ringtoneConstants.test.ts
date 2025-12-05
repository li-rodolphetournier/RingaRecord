import { describe, it, expect } from 'vitest';
import {
  MAX_RINGTONE_DURATION_SECONDS,
  MIN_RINGTONE_DURATION_SECONDS,
} from './ringtoneConstants';

describe('ringtoneConstants', () => {
  it('should have valid duration constants', () => {
    expect(MIN_RINGTONE_DURATION_SECONDS).toBe(1);
    expect(MAX_RINGTONE_DURATION_SECONDS).toBe(120);
    expect(MIN_RINGTONE_DURATION_SECONDS).toBeLessThan(MAX_RINGTONE_DURATION_SECONDS);
  });

  it('should have reasonable duration limits', () => {
    // Les sonneries sont généralement entre 5 et 40 secondes
    // Mais on permet jusqu'à 120 secondes pour des cas spéciaux
    expect(MAX_RINGTONE_DURATION_SECONDS).toBeGreaterThanOrEqual(40);
    expect(MAX_RINGTONE_DURATION_SECONDS).toBeLessThanOrEqual(300); // Limite raisonnable
    expect(MIN_RINGTONE_DURATION_SECONDS).toBeGreaterThan(0);
  });
});

