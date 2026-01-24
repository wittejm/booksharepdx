import { describe, it, expect } from "vitest";
import {
  neighborhoodCentroids,
  getNeighborhoodCentroid,
  getAllNeighborhoodIds,
  getNeighborhoodName,
} from "./neighborhoodCentroids.js";

describe("neighborhoodCentroids", () => {
  describe("neighborhoodCentroids data", () => {
    it("should have entries for Portland neighborhoods", () => {
      expect(Object.keys(neighborhoodCentroids).length).toBeGreaterThan(50);
    });

    it("should have valid structure for each neighborhood", () => {
      for (const [id, neighborhood] of Object.entries(neighborhoodCentroids)) {
        expect(neighborhood).toHaveProperty("name");
        expect(neighborhood).toHaveProperty("lat");
        expect(neighborhood).toHaveProperty("lng");
        expect(typeof neighborhood.name).toBe("string");
        expect(typeof neighborhood.lat).toBe("number");
        expect(typeof neighborhood.lng).toBe("number");
      }
    });

    it("should have valid Portland-area coordinates", () => {
      // Portland is roughly between lat 45.4-45.7 and lng -122.4 to -123.0
      for (const [id, neighborhood] of Object.entries(neighborhoodCentroids)) {
        expect(neighborhood.lat).toBeGreaterThan(45.3);
        expect(neighborhood.lat).toBeLessThan(45.8);
        expect(neighborhood.lng).toBeGreaterThan(-123.1);
        expect(neighborhood.lng).toBeLessThan(-122.4);
      }
    });

    it("should include well-known Portland neighborhoods", () => {
      expect(neighborhoodCentroids["pearl-district"]).toBeDefined();
      expect(
        neighborhoodCentroids["alberta-arts-district"] ||
          neighborhoodCentroids["concordia"],
      ).toBeDefined();
      expect(neighborhoodCentroids["sellwood-moreland"]).toBeDefined();
      expect(
        neighborhoodCentroids["hawthorne"] || neighborhoodCentroids["buckman"],
      ).toBeDefined();
    });
  });

  describe("getNeighborhoodCentroid", () => {
    it("should return centroid for valid neighborhood id", () => {
      const centroid = getNeighborhoodCentroid("pearl-district");
      expect(centroid).not.toBeNull();
      expect(centroid?.lat).toBeCloseTo(45.531, 2);
      expect(centroid?.lng).toBeCloseTo(-122.684, 2);
    });

    it("should return null for invalid neighborhood id", () => {
      expect(getNeighborhoodCentroid("fake-neighborhood")).toBeNull();
      expect(getNeighborhoodCentroid("")).toBeNull();
    });

    it("should return only lat and lng, not name", () => {
      const centroid = getNeighborhoodCentroid("buckman");
      expect(centroid).toEqual({
        lat: expect.any(Number),
        lng: expect.any(Number),
      });
      expect(centroid).not.toHaveProperty("name");
    });
  });

  describe("getAllNeighborhoodIds", () => {
    it("should return array of all neighborhood ids", () => {
      const ids = getAllNeighborhoodIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(50);
    });

    it("should return same keys as neighborhoodCentroids object", () => {
      const ids = getAllNeighborhoodIds();
      const objectKeys = Object.keys(neighborhoodCentroids);
      expect(ids.sort()).toEqual(objectKeys.sort());
    });

    it("should include known neighborhoods", () => {
      const ids = getAllNeighborhoodIds();
      expect(ids).toContain("pearl-district");
      expect(ids).toContain("buckman");
      expect(ids).toContain("sellwood-moreland");
    });
  });

  describe("getNeighborhoodName", () => {
    it("should return display name for valid neighborhood id", () => {
      expect(getNeighborhoodName("pearl-district")).toBe("Pearl District");
      expect(getNeighborhoodName("buckman")).toBe("Buckman");
      expect(getNeighborhoodName("sellwood-moreland")).toBe(
        "Sellwood-Moreland",
      );
    });

    it("should return null for invalid neighborhood id", () => {
      expect(getNeighborhoodName("fake-neighborhood")).toBeNull();
      expect(getNeighborhoodName("")).toBeNull();
    });

    it("should handle hyphenated names correctly", () => {
      expect(getNeighborhoodName("mt-tabor")).toBe("Mt. Tabor");
      expect(getNeighborhoodName("st-johns")).toBe("St. Johns");
    });
  });
});
