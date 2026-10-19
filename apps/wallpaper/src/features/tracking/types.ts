export interface TrackingPoint {
  readonly x: number
  readonly y: number
}
export interface FacePosition extends TrackingPoint {
  readonly detected?: boolean
}
export interface TrackingViewport {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly scale: number
}
export const CAMERA_SENSITIVITY = 3
export interface TrackingParameter {
  readonly id: string
  readonly name?: string
  readonly positiveY?: 'up' | 'down'
  readonly minimum: number
  readonly maximum: number
  readonly defaultValue: number
}
export interface CursorPosition extends TrackingPoint {
  readonly width: number
  readonly height: number
}

/** Character render bounds normalized to its target monitor. */
export interface CameraSurface {
  readonly aspect: number
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}
