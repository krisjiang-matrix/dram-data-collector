import { describe, it, expect } from "vitest";
import { detectInflectionPoints, filterSignificantPoints, calculateTrendDirection } from "./inflectionPoints";

describe("inflectionPoints", () => {
  describe("detectInflectionPoints", () => {
    it("should detect peaks in price data", () => {
      // Data: 1, 2, 3, 2, 1 - peak at index 2
      const prices = [1, 2, 3, 2, 1];
      const points = detectInflectionPoints(prices, 1);

      expect(points).toHaveLength(1);
      expect(points[0]).toMatchObject({
        index: 2,
        value: 3,
        type: "peak",
      });
    });

    it("should detect valleys in price data", () => {
      // Data: 3, 2, 1, 2, 3 - valley at index 2
      const prices = [3, 2, 1, 2, 3];
      const points = detectInflectionPoints(prices, 1);

      expect(points).toHaveLength(1);
      expect(points[0]).toMatchObject({
        index: 2,
        value: 1,
        type: "valley",
      });
    });

    it("should detect multiple peaks and valleys", () => {
      // Data: 1, 3, 1, 3, 1 - peaks at 1,3 and valleys at 2,4
      const prices = [1, 3, 1, 3, 1];
      const points = detectInflectionPoints(prices, 1);

      expect(points.length).toBeGreaterThan(0);
      const peaks = points.filter(p => p.type === "peak");
      const valleys = points.filter(p => p.type === "valley");

      expect(peaks.length).toBeGreaterThan(0);
      expect(valleys.length).toBeGreaterThan(0);
    });

    it("should return empty array for monotonic data", () => {
      const prices = [1, 2, 3, 4, 5];
      const points = detectInflectionPoints(prices, 1);

      expect(points).toHaveLength(0);
    });

    it("should respect window size parameter", () => {
      // With larger window, fewer points qualify as inflection points
      const prices = [1, 2, 3, 2, 1, 2, 3, 2, 1];
      const pointsWindow1 = detectInflectionPoints(prices, 1);
      const pointsWindow2 = detectInflectionPoints(prices, 2);

      expect(pointsWindow2.length).toBeLessThanOrEqual(pointsWindow1.length);
    });

    it("should handle insufficient data gracefully", () => {
      const prices = [1, 2, 3];
      const points = detectInflectionPoints(prices, 2);

      expect(points).toHaveLength(0);
    });
  });

  describe("filterSignificantPoints", () => {
    it("should remove points that are too close together", () => {
      const points = [
        { index: 0, value: 10, type: "peak" as const },
        { index: 1, value: 11, type: "peak" as const },
        { index: 5, value: 9, type: "valley" as const },
      ];

      const filtered = filterSignificantPoints(points, 3, 0);

      expect(filtered.length).toBeLessThan(points.length);
    });

    it("should remove points with small magnitude changes", () => {
      const points = [
        { index: 0, value: 10, type: "peak" as const },
        { index: 5, value: 10.1, type: "valley" as const },
        { index: 10, value: 5, type: "valley" as const },
      ];

      const filtered = filterSignificantPoints(points, 1, 1);

      expect(filtered.length).toBeLessThan(points.length);
    });

    it("should keep significant points", () => {
      const points = [
        { index: 0, value: 10, type: "peak" as const },
        { index: 5, value: 5, type: "valley" as const },
        { index: 10, value: 15, type: "peak" as const },
      ];

      const filtered = filterSignificantPoints(points, 2, 1);

      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  describe("calculateTrendDirection", () => {
    it("should detect uptrend", () => {
      const prices = [1, 2, 3, 4, 5, 6, 7];
      const direction = calculateTrendDirection(prices, 3, 2);

      expect(direction).toBe(1);
    });

    it("should detect downtrend", () => {
      const prices = [7, 6, 5, 4, 3, 2, 1];
      const direction = calculateTrendDirection(prices, 3, 2);

      expect(direction).toBe(-1);
    });

    it("should return 0 for insufficient data", () => {
      const prices = [1, 2, 3];
      const direction = calculateTrendDirection(prices, 0, 2);

      expect(direction).toBe(0);
    });
  });
});
