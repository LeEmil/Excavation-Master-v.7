
import { Point2D, ExcavationParams } from '../types';

/**
 * Snaps a value to the nearest 0.1 interval.
 */
export const snapToInterval = (val: number): number => Math.round(val * 10) / 10;

/**
 * Calculates the area of a polygon using the Shoelace formula.
 */
export const calculatePolygonArea = (points: { x: number; y: number }[]): number => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

/**
 * Ensures the first and last points are snapped to the excavation slope lines.
 * Also ensures overall 0.1m precision for all points.
 */
export const constrainGroundPoints = (
  points: Point2D[],
  params: ExcavationParams
): Point2D[] => {
  if (points.length < 2) return points;

  const { width, slopeRatio } = params;

  return points.map((p, idx) => {
    let newX = snapToInterval(p.x);
    let newY = snapToInterval(p.y);

    if (idx === 0) {
      // Snapped Left boundary: x = -width/2 - slopeRatio * y
      newX = snapToInterval(-width / 2 - slopeRatio * newY);
    } else if (idx === points.length - 1) {
      // Snapped Right boundary: x = width/2 + slopeRatio * y
      newX = snapToInterval(width / 2 + slopeRatio * newY);
    }

    return { ...p, x: newX, y: newY };
  });
};

/**
 * Get the full excavation cross-section polygon (closing the shape with the bottom slab).
 */
export const getExcavationPolygon = (
  groundPoints: Point2D[],
  params: ExcavationParams
): { x: number; y: number }[] => {
  const { width } = params;
  
  return [
    { x: snapToInterval(width / 2), y: 0 },
    { x: snapToInterval(-width / 2), y: 0 },
    ...groundPoints
  ];
};
