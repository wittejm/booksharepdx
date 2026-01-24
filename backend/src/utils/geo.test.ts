import { describe, it, expect } from "vitest";
import { haversineDistance } from "./geo.js";

describe("haversineDistance", () => {
  it("should return 0 for same point", () => {
    const distance = haversineDistance(45.5, -122.6, 45.5, -122.6);
    expect(distance).toBe(0);
  });

  it("should calculate distance between Portland neighborhoods", () => {
    // Pearl District to Sellwood-Moreland (roughly 5-6 miles)
    const pearlLat = 45.531;
    const pearlLng = -122.684;
    const sellwoodLat = 45.475;
    const sellwoodLng = -122.65;

    const distance = haversineDistance(
      pearlLat,
      pearlLng,
      sellwoodLat,
      sellwoodLng,
    );
    expect(distance).toBeGreaterThan(4);
    expect(distance).toBeLessThan(6);
  });

  it("should be symmetric (A to B equals B to A)", () => {
    const lat1 = 45.5,
      lng1 = -122.6;
    const lat2 = 45.6,
      lng2 = -122.7;

    const distanceAB = haversineDistance(lat1, lng1, lat2, lng2);
    const distanceBA = haversineDistance(lat2, lng2, lat1, lng1);

    expect(distanceAB).toBeCloseTo(distanceBA, 10);
  });

  it("should handle known distances accurately", () => {
    // Portland to Seattle is approximately 145 miles
    const portlandLat = 45.5152;
    const portlandLng = -122.6784;
    const seattleLat = 47.6062;
    const seattleLng = -122.3321;

    const distance = haversineDistance(
      portlandLat,
      portlandLng,
      seattleLat,
      seattleLng,
    );
    expect(distance).toBeGreaterThan(140);
    expect(distance).toBeLessThan(150);
  });

  it("should handle crossing the prime meridian", () => {
    // London to Paris is approximately 214 miles
    const londonLat = 51.5074;
    const londonLng = -0.1278;
    const parisLat = 48.8566;
    const parisLng = 2.3522;

    const distance = haversineDistance(
      londonLat,
      londonLng,
      parisLat,
      parisLng,
    );
    expect(distance).toBeGreaterThan(200);
    expect(distance).toBeLessThan(230);
  });

  it("should handle crossing the equator", () => {
    // Quito, Ecuador to Bogota, Colombia
    const quitoLat = -0.1807;
    const quitoLng = -78.4678;
    const bogotaLat = 4.711;
    const bogotaLng = -74.0721;

    const distance = haversineDistance(
      quitoLat,
      quitoLng,
      bogotaLat,
      bogotaLng,
    );
    expect(distance).toBeGreaterThan(400);
    expect(distance).toBeLessThan(500);
  });

  it("should handle antipodal points", () => {
    // Opposite sides of the earth (half circumference ~12,450 miles)
    const distance = haversineDistance(0, 0, 0, 180);
    expect(distance).toBeGreaterThan(12000);
    expect(distance).toBeLessThan(13000);
  });

  it("should handle small distances accurately", () => {
    // Two points about 0.1 miles apart in Portland
    const lat1 = 45.52;
    const lng1 = -122.68;
    const lat2 = 45.5215; // ~0.1 miles north
    const lng2 = -122.68;

    const distance = haversineDistance(lat1, lng1, lat2, lng2);
    expect(distance).toBeGreaterThan(0.09);
    expect(distance).toBeLessThan(0.12);
  });

  it("should handle negative latitudes", () => {
    // Sydney, Australia to Melbourne, Australia (~438 miles)
    const sydneyLat = -33.8688;
    const sydneyLng = 151.2093;
    const melbourneLat = -37.8136;
    const melbourneLng = 144.9631;

    const distance = haversineDistance(
      sydneyLat,
      sydneyLng,
      melbourneLat,
      melbourneLng,
    );
    expect(distance).toBeGreaterThan(400);
    expect(distance).toBeLessThan(480);
  });
});
