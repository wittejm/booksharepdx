// Re-export from shared package
export { calculateDistance } from '@booksharepdx/shared';

// Legacy wrapper for backward compatibility
import { calculateDistance } from '@booksharepdx/shared';

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return calculateDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
}
