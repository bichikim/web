/**
 * size of the rectangle
 */
export interface Size {
  height: number
  width: number
}

/**
 * x, y position
 */
export interface Position {
  x: number
  y: number
}

/** A read-only two-dimensional point. */
export type Point = Readonly<Position>

/**
 * position and size of the rectangle
 */
export interface Rect extends Size, Position {
  //
}
