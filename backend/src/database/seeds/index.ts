import 'reflect-metadata';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppDataSource } from '../../config/database.js';
import { Neighborhood } from '../../entities/Neighborhood.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    NAME?: string;
    name?: string;
    MAPLABEL?: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

function calculateCentroid(coordinates: number[][][]): { lat: number; lng: number } {
  // For a polygon, calculate the centroid of the first ring (exterior)
  const ring = coordinates[0];
  let sumLat = 0;
  let sumLng = 0;

  for (const [lng, lat] of ring) {
    sumLat += lat;
    sumLng += lng;
  }

  return {
    lat: sumLat / ring.length,
    lng: sumLng / ring.length,
  };
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seedNeighborhoods() {
  console.log('Initializing database connection...');
  await AppDataSource.initialize();

  const neighborhoodRepo = AppDataSource.getRepository(Neighborhood);

  // Check if neighborhoods already exist
  const existingCount = await neighborhoodRepo.count();
  if (existingCount > 0) {
    console.log(`Found ${existingCount} existing neighborhoods. Skipping seed.`);
    await AppDataSource.destroy();
    return;
  }

  // Load GeoJSON file
  const geojsonPath = path.resolve(__dirname, '../../../../Neighborhoods_regions.geojson');

  let geojsonData: GeoJSONCollection;
  try {
    const fileContent = await fs.readFile(geojsonPath, 'utf-8');
    geojsonData = JSON.parse(fileContent);
  } catch (error) {
    console.error('Failed to load GeoJSON file:', error);
    console.log('Make sure Neighborhoods_regions.geojson exists in the project root.');
    await AppDataSource.destroy();
    process.exit(1);
  }

  console.log(`Found ${geojsonData.features.length} neighborhoods in GeoJSON`);

  const neighborhoods: Neighborhood[] = [];

  for (const feature of geojsonData.features) {
    const name = feature.properties.NAME || feature.properties.name || feature.properties.MAPLABEL || 'Unknown';
    const id = createSlug(name);

    // Handle both Polygon and MultiPolygon
    let coordinates: number[][][];
    if (feature.geometry.type === 'MultiPolygon') {
      // Take the first polygon of the MultiPolygon
      coordinates = (feature.geometry.coordinates as number[][][][])[0];
    } else {
      coordinates = feature.geometry.coordinates as number[][][];
    }

    const centroid = calculateCentroid(coordinates);

    const neighborhood = neighborhoodRepo.create({
      id,
      name,
      boundaries: {
        type: 'Polygon',
        coordinates,
      },
      centroidLat: centroid.lat,
      centroidLng: centroid.lng,
    });

    neighborhoods.push(neighborhood);
  }

  console.log(`Saving ${neighborhoods.length} neighborhoods...`);
  await neighborhoodRepo.save(neighborhoods);

  console.log('Seed completed successfully!');
  await AppDataSource.destroy();
}

seedNeighborhoods().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
