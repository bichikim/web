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

/**
 * position and size of the rectangle
 */
export interface Rect extends Size, Position {
  //
}
