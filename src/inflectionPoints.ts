/**
 * Inflection point detection algorithm
 * Identifies local maxima and minima in price data
 */

export interface InflectionPoint {
  index: number;
  value: number;
  type: "peak" | "valley";
  date?: Date;
}

/**
 * Detect inflection points (local extrema) in a price series
 * Uses a simple local comparison approach with configurable window
 * @param prices Array of price values
 * @param windowSize Number of neighbors to consider on each side (default: 2)
 * @returns Array of inflection points with their indices and types
 */
export function detectInflectionPoints(
  prices: number[],
  windowSize: number = 2
): InflectionPoint[] {
  if (prices.length < windowSize * 2 + 1) {
    return [];
  }

  const inflectionPoints: InflectionPoint[] = [];

  for (let i = windowSize; i < prices.length - windowSize; i++) {
    const current = prices[i];
    
    // Get neighbors
    const leftNeighbors = prices.slice(i - windowSize, i);
    const rightNeighbors = prices.slice(i + 1, i + windowSize + 1);
    
    const allNeighbors = [...leftNeighbors, ...rightNeighbors];
    
    // Check if it's a local maximum (peak)
    if (allNeighbors.every(neighbor => current > neighbor)) {
      inflectionPoints.push({
        index: i,
        value: current,
        type: "peak",
      });
    }
    // Check if it's a local minimum (valley)
    else if (allNeighbors.every(neighbor => current < neighbor)) {
      inflectionPoints.push({
        index: i,
        value: current,
        type: "valley",
      });
    }
  }

  return inflectionPoints;
}

/**
 * Detect inflection points with date information
 * @param data Array of objects with value and date
 * @param windowSize Number of neighbors to consider
 * @returns Array of inflection points with dates
 */
export function detectInflectionPointsWithDates(
  data: Array<{ value: number; date: Date }>,
  windowSize: number = 2
): InflectionPoint[] {
  const prices = data.map(d => d.value);
  const basePoints = detectInflectionPoints(prices, windowSize);

  return basePoints.map(point => ({
    ...point,
    date: data[point.index]?.date,
  }));
}

/**
 * Calculate trend direction at a point
 * Returns: 1 for uptrend, -1 for downtrend, 0 for neutral
 */
export function calculateTrendDirection(
  prices: number[],
  index: number,
  windowSize: number = 3
): number {
  if (index < windowSize || index >= prices.length - windowSize) {
    return 0;
  }

  const before = prices.slice(index - windowSize, index);
  const after = prices.slice(index + 1, index + windowSize + 1);

  const beforeAvg = before.reduce((a, b) => a + b, 0) / before.length;
  const afterAvg = after.reduce((a, b) => a + b, 0) / after.length;

  if (afterAvg > beforeAvg) return 1; // uptrend
  if (afterAvg < beforeAvg) return -1; // downtrend
  return 0; // neutral
}

/**
 * Filter inflection points by significance
 * Removes points that are too close together or have small magnitude changes
 * @param points Array of inflection points
 * @param minDistance Minimum distance between points (in indices)
 * @param minMagnitude Minimum price change magnitude to consider significant
 * @returns Filtered inflection points
 */
export function filterSignificantPoints(
  points: InflectionPoint[],
  minDistance: number = 3,
  minMagnitude: number = 0
): InflectionPoint[] {
  if (points.length === 0) return [];

  const filtered: InflectionPoint[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const lastPoint = filtered[filtered.length - 1];
    const currentPoint = points[i];

    const distance = currentPoint.index - lastPoint.index;
    const magnitude = Math.abs(currentPoint.value - lastPoint.value);

    if (distance >= minDistance && magnitude >= minMagnitude) {
      filtered.push(currentPoint);
    }
  }

  return filtered;
}
