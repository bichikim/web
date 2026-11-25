export interface TrackingPoint {
  readonly x: number
  readonly y: number
  readonly z?: number
}
export interface FacePose {
  readonly head: TrackingPoint
  readonly eyes: TrackingPoint
}
export interface FacePosition extends TrackingPoint {
  /** Independently detected shoulder yaw; missing or null returns only the body to neutral. */
  readonly body?: TrackingPoint | null
  readonly pose?: FacePose | null
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
export const POSE_ROTATION_DEGREES = 30
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
