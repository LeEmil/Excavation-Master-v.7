
export interface Point2D {
  x: number;
  y: number;
  id: string;
}

export interface ExcavationParams {
  length: number;    // Z-dimension
  width: number;     // X-dimension (bottom slab)
  slopeRatio: number; // horizontal part of 1:x slope
}

export interface GroundProfile {
  points: Point2D[];
}
