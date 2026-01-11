import { describe, it, expect } from 'vitest';
import { calculateDistance, getLocationCoords, formatDistance } from './distance';
import type { Neighborhood } from '@booksharepdx/shared';

describe('distance utilities', () => {
  describe('calculateDistance', () => {
    it('should return 0 for same point', () => {
      const loc = { lat: 45.5, lng: -122.6 };
      expect(calculateDistance(loc, loc)).toBe(0);
    });

    it('should calculate distance between Portland neighborhoods', () => {
      const pearlDistrict = { lat: 45.531, lng: -122.684 };
      const sellwood = { lat: 45.475, lng: -122.650 };

      const distance = calculateDistance(pearlDistrict, sellwood);
      expect(distance).toBeGreaterThan(4);
      expect(distance).toBeLessThan(6);
    });

    it('should be symmetric', () => {
      const loc1 = { lat: 45.5, lng: -122.6 };
      const loc2 = { lat: 45.6, lng: -122.7 };

      const distanceAB = calculateDistance(loc1, loc2);
      const distanceBA = calculateDistance(loc2, loc1);

      expect(distanceAB).toBeCloseTo(distanceBA, 10);
    });

    it('should handle Portland to Seattle distance', () => {
      const portland = { lat: 45.5152, lng: -122.6784 };
      const seattle = { lat: 47.6062, lng: -122.3321 };

      const distance = calculateDistance(portland, seattle);
      expect(distance).toBeGreaterThan(140);
      expect(distance).toBeLessThan(150);
    });
  });

  describe('getLocationCoords', () => {
    const mockNeighborhoods: Neighborhood[] = [
      {
        id: 'pearl-district',
        name: 'Pearl District',
        centroid: { lat: 45.531, lng: -122.684 },
        boundaries: { type: 'Polygon', coordinates: [] },
      },
      {
        id: 'buckman',
        name: 'Buckman',
        centroid: { lat: 45.519, lng: -122.656 },
        boundaries: { type: 'Polygon', coordinates: [] },
      },
    ];

    it('should return pin coordinates directly', () => {
      const location = { type: 'pin' as const, lat: 45.5, lng: -122.6 };
      const coords = getLocationCoords(location, mockNeighborhoods);

      expect(coords).toEqual({ lat: 45.5, lng: -122.6 });
    });

    it('should return null for pin without coordinates', () => {
      const location = { type: 'pin' as const };
      const coords = getLocationCoords(location, mockNeighborhoods);

      expect(coords).toBeNull();
    });

    it('should return neighborhood centroid', () => {
      const location = { type: 'neighborhood' as const, neighborhoodId: 'pearl-district' };
      const coords = getLocationCoords(location, mockNeighborhoods);

      expect(coords).toEqual({ lat: 45.531, lng: -122.684 });
    });

    it('should return null for neighborhood without id', () => {
      const location = { type: 'neighborhood' as const };
      const coords = getLocationCoords(location, mockNeighborhoods);

      expect(coords).toBeNull();
    });

    it('should throw error for unknown neighborhood', () => {
      const location = { type: 'neighborhood' as const, neighborhoodId: 'unknown' };

      expect(() => getLocationCoords(location, mockNeighborhoods)).toThrow(
        'Neighborhood with id "unknown" not found'
      );
    });
  });

  describe('formatDistance', () => {
    it('should format distance with one decimal place', () => {
      expect(formatDistance(1.234)).toBe('1.2 mi');
      expect(formatDistance(5.678)).toBe('5.7 mi');
      expect(formatDistance(10.05)).toBe('10.1 mi');
    });

    it('should handle whole numbers', () => {
      expect(formatDistance(5)).toBe('5 mi');
      expect(formatDistance(10.0)).toBe('10 mi');
    });

    it('should handle very small distances', () => {
      expect(formatDistance(0.1)).toBe('0.1 mi');
      expect(formatDistance(0.05)).toBe('0.1 mi');
      expect(formatDistance(0)).toBe('0 mi');
    });

    it('should throw for negative distances', () => {
      expect(() => formatDistance(-1)).toThrow('Distance cannot be negative');
    });
  });
});
