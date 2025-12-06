import { describe, it, expect } from 'vitest';
import {
  containerVariants,
  itemVariants,
  cardVariants,
  pageVariants,
  modalVariants,
  buttonVariants,
  iconVariants,
  scrollRevealVariants,
  toastVariants,
  favoriteItemVariants,
  headerVariants,
  statVariants,
} from './animations';

/**
 * Tests pour les variantes d'animation Framer Motion
 * Vérifie que toutes les variantes sont correctement définies
 */
describe('animations', () => {
  describe('containerVariants', () => {
    it('devrait avoir les états hidden et show', () => {
      expect(containerVariants).toHaveProperty('hidden');
      expect(containerVariants).toHaveProperty('show');
    });

    it('devrait avoir une transition avec staggerChildren', () => {
      expect(containerVariants.show).toHaveProperty('transition');
      expect(containerVariants.show?.transition).toHaveProperty('staggerChildren');
      expect(containerVariants.show?.transition).toHaveProperty('delayChildren');
    });
  });

  describe('itemVariants', () => {
    it('devrait avoir les états hidden, show et exit', () => {
      expect(itemVariants).toHaveProperty('hidden');
      expect(itemVariants).toHaveProperty('show');
      expect(itemVariants).toHaveProperty('exit');
    });

    it('devrait animer opacity, y et scale', () => {
      expect(itemVariants.hidden).toHaveProperty('opacity', 0);
      expect(itemVariants.hidden).toHaveProperty('y', 20);
      expect(itemVariants.hidden).toHaveProperty('scale', 0.95);
      
      expect(itemVariants.show).toHaveProperty('opacity', 1);
      expect(itemVariants.show).toHaveProperty('y', 0);
      expect(itemVariants.show).toHaveProperty('scale', 1);
    });
  });

  describe('cardVariants', () => {
    it('devrait avoir les états hidden, show et hover', () => {
      expect(cardVariants).toHaveProperty('hidden');
      expect(cardVariants).toHaveProperty('show');
      expect(cardVariants).toHaveProperty('hover');
    });

    it('devrait avoir un effet de hover avec élévation', () => {
      expect(cardVariants.hover).toHaveProperty('y', -4);
    });
  });

  describe('pageVariants', () => {
    it('devrait avoir les états initial, animate et exit', () => {
      expect(pageVariants).toHaveProperty('initial');
      expect(pageVariants).toHaveProperty('animate');
      expect(pageVariants).toHaveProperty('exit');
    });

    it('devrait animer opacity et x', () => {
      expect(pageVariants.initial).toHaveProperty('opacity', 0);
      expect(pageVariants.initial).toHaveProperty('x', -20);
      
      expect(pageVariants.animate).toHaveProperty('opacity', 1);
      expect(pageVariants.animate).toHaveProperty('x', 0);
    });
  });

  describe('modalVariants', () => {
    it('devrait avoir les états hidden, visible et exit', () => {
      expect(modalVariants).toHaveProperty('hidden');
      expect(modalVariants).toHaveProperty('visible');
      expect(modalVariants).toHaveProperty('exit');
    });

    it('devrait animer opacity et scale', () => {
      expect(modalVariants.hidden).toHaveProperty('opacity', 0);
      expect(modalVariants.hidden).toHaveProperty('scale', 0.95);
      
      expect(modalVariants.visible).toHaveProperty('opacity', 1);
      expect(modalVariants.visible).toHaveProperty('scale', 1);
    });
  });

  describe('buttonVariants', () => {
    it('devrait avoir les états rest, hover et tap', () => {
      expect(buttonVariants).toHaveProperty('rest');
      expect(buttonVariants).toHaveProperty('hover');
      expect(buttonVariants).toHaveProperty('tap');
    });

    it('devrait avoir un effet de scale au hover et tap', () => {
      expect(buttonVariants.rest).toHaveProperty('scale', 1);
      expect(buttonVariants.hover).toHaveProperty('scale', 1.05);
      expect(buttonVariants.tap).toHaveProperty('scale', 0.95);
    });
  });

  describe('iconVariants', () => {
    it('devrait avoir les états hidden et visible', () => {
      expect(iconVariants).toHaveProperty('hidden');
      expect(iconVariants).toHaveProperty('visible');
    });

    it('devrait animer opacity, scale et rotate', () => {
      expect(iconVariants.hidden).toHaveProperty('opacity', 0);
      expect(iconVariants.hidden).toHaveProperty('scale', 0);
      expect(iconVariants.hidden).toHaveProperty('rotate', -180);
      
      expect(iconVariants.visible).toHaveProperty('opacity', 1);
      expect(iconVariants.visible).toHaveProperty('scale', 1);
      expect(iconVariants.visible).toHaveProperty('rotate', 0);
    });
  });

  describe('scrollRevealVariants', () => {
    it('devrait avoir les états hidden et visible', () => {
      expect(scrollRevealVariants).toHaveProperty('hidden');
      expect(scrollRevealVariants).toHaveProperty('visible');
    });

    it('devrait animer opacity et y', () => {
      expect(scrollRevealVariants.hidden).toHaveProperty('opacity', 0);
      expect(scrollRevealVariants.hidden).toHaveProperty('y', 50);
      
      expect(scrollRevealVariants.visible).toHaveProperty('opacity', 1);
      expect(scrollRevealVariants.visible).toHaveProperty('y', 0);
    });
  });

  describe('toastVariants', () => {
    it('devrait avoir les états hidden, visible et exit', () => {
      expect(toastVariants).toHaveProperty('hidden');
      expect(toastVariants).toHaveProperty('visible');
      expect(toastVariants).toHaveProperty('exit');
    });
  });

  describe('favoriteItemVariants', () => {
    it('devrait avoir les états hidden, show et exit', () => {
      expect(favoriteItemVariants).toHaveProperty('hidden');
      expect(favoriteItemVariants).toHaveProperty('show');
      expect(favoriteItemVariants).toHaveProperty('exit');
    });
  });

  describe('headerVariants', () => {
    it('devrait avoir les états hidden et visible', () => {
      expect(headerVariants).toHaveProperty('hidden');
      expect(headerVariants).toHaveProperty('visible');
    });
  });

  describe('statVariants', () => {
    it('devrait avoir les états hidden et visible', () => {
      expect(statVariants).toHaveProperty('hidden');
      expect(statVariants).toHaveProperty('visible');
    });
  });
});

