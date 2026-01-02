// Geocoding utilities using Nominatim (OpenStreetMap)

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    // Append "Portland, Oregon" to improve accuracy
    const searchQuery = address.includes('Portland') ? address : `${address}, Portland, Oregon`;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'us');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'BookSharePDX/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Point-in-polygon algorithm (ray casting)
export function isPointInPolygon(point: { lat: number; lng: number }, polygon: number[][]): boolean {
  const x = point.lng;
  const y = point.lat;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]; // longitude
    const yi = polygon[i][1]; // latitude
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

// Find which neighborhood contains a given point
export function findNeighborhoodByPoint(
  point: { lat: number; lng: number },
  neighborhoods: Array<{ id: string; name: string; boundaries: { type: string; coordinates: any } }>
): string | null {
  for (const neighborhood of neighborhoods) {
    if (neighborhood.boundaries.type === 'Polygon') {
      // Polygon coordinates are [outer ring, ...holes]
      const outerRing = neighborhood.boundaries.coordinates[0];
      if (isPointInPolygon(point, outerRing)) {
        return neighborhood.id;
      }
    } else if (neighborhood.boundaries.type === 'MultiPolygon') {
      // MultiPolygon has multiple polygons
      for (const polygon of neighborhood.boundaries.coordinates) {
        const outerRing = polygon[0];
        if (isPointInPolygon(point, outerRing)) {
          return neighborhood.id;
        }
      }
    }
  }

  return null;
}
