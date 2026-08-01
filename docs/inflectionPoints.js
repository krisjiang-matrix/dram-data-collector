/* Port of src/inflectionPoints.ts for the browser dashboard (no build step). */

export function detectInflectionPoints(prices, windowSize = 2) {
  if (prices.length < windowSize * 2 + 1) {
    return [];
  }

  const inflectionPoints = [];

  for (let i = windowSize; i < prices.length - windowSize; i++) {
    const current = prices[i];

    const leftNeighbors = prices.slice(i - windowSize, i);
    const rightNeighbors = prices.slice(i + 1, i + windowSize + 1);

    const allNeighbors = [...leftNeighbors, ...rightNeighbors];

    if (allNeighbors.every((neighbor) => current > neighbor)) {
      inflectionPoints.push({ index: i, value: current, type: "peak" });
    } else if (allNeighbors.every((neighbor) => current < neighbor)) {
      inflectionPoints.push({ index: i, value: current, type: "valley" });
    }
  }

  return inflectionPoints;
}

export function detectInflectionPointsWithDates(data, windowSize = 2) {
  const prices = data.map((d) => d.value);
  const basePoints = detectInflectionPoints(prices, windowSize);

  return basePoints.map((point) => ({
    ...point,
    date: data[point.index]?.date,
  }));
}

export function calculateTrendDirection(prices, index, windowSize = 3) {
  if (index < windowSize || index >= prices.length - windowSize) {
    return 0;
  }

  const before = prices.slice(index - windowSize, index);
  const after = prices.slice(index + 1, index + windowSize + 1);

  const beforeAvg = before.reduce((a, b) => a + b, 0) / before.length;
  const afterAvg = after.reduce((a, b) => a + b, 0) / after.length;

  if (afterAvg > beforeAvg) return 1;
  if (afterAvg < beforeAvg) return -1;
  return 0;
}

export function filterSignificantPoints(points, minDistance = 3, minMagnitude = 0) {
  if (points.length === 0) return [];

  const filtered = [points[0]];

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
