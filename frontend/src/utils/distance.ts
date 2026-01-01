import type { UserLocation, Neighborhood } from '@booksharepdx/shared';

/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula.
 * @param loc1 - First location with lat and lng in decimal degrees
 * @param loc2 - Second location with lat and lng in decimal degrees
 * @returns Distance in miles
 */
export function calculateDistance(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number {
  const R = 3959; // Earth's radius in miles

  const lat1 = (loc1.lat * Math.PI) / 180;
  const lat2 = (loc2.lat * Math.PI) / 180;
  const deltaLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const deltaLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Extracts latitude and longitude coordinates from a UserLocation.
 * For neighborhood locations, returns the centroid coordinates.
 * For pin locations, returns the direct lat/lng coordinates.
 * @param location - The user's location (neighborhood or pin)
 * @param neighborhoods - Array of neighborhoods to look up centroids
 * @returns Object with lat and lng properties, or null if location is invalid
 * @throws Error if neighborhood is not found when location type is 'neighborhood'
 */
export function getLocationCoords(
  location: UserLocation,
  neighborhoods: Neighborhood[]
): { lat: number; lng: number } | null {
  if (location.type === 'pin') {
    if (location.lat !== undefined && location.lng !== undefined) {
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  }

  if (location.type === 'neighborhood') {
    if (!location.neighborhoodId) {
      return null;
    }

    const neighborhood = neighborhoods.find((n) => n.id === location.neighborhoodId);
    if (!neighborhood) {
      throw new Error(`Neighborhood with id "${location.neighborhoodId}" not found`);
    }

    return {
      lat: neighborhood.centroid.lat,
      lng: neighborhood.centroid.lng,
    };
  }

  return null;
}

/**
 * Formats a distance value in miles to a human-readable string.
 * @param miles - Distance in miles
 * @returns Formatted distance string (e.g., "0.8 mi", "2.3 mi")
 */
export function formatDistance(miles: number): string {
  if (miles < 0) {
    throw new Error('Distance cannot be negative');
  }

  // Round to 1 decimal place
  const rounded = Math.round(miles * 10) / 10;

  return `${rounded} mi`;
}
