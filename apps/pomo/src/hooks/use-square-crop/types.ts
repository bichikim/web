export interface SquareCropPoint {
  readonly x: number
  readonly y: number
}

export interface SquareCropDimensions {
  readonly height: number
  readonly width: number
}

export interface SquareCropSelection extends SquareCropPoint {
  readonly size: number
}

export interface SquareCropFrame {
  readonly cropSize: number
  readonly cropX: number
  readonly cropY: number
  readonly imageHeight: number
  readonly imageWidth: number
  readonly imageX: number
  readonly imageY: number
  readonly maximumCropSize: number
  readonly maxX: number
  readonly maxY: number
  readonly sourceSize: number
  readonly sourceX: number
  readonly sourceY: number
}

export type SquareCropHandle =
  | 'move'
  | 'north'
  | 'northeast'
  | 'northwest'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'

export type SquareCropResizeHandle = Exclude<SquareCropHandle, 'move'>

export interface SquareCropZoomLimits {
  readonly maximum: number
  readonly minimum: number
}
