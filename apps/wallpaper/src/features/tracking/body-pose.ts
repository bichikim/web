import {POSE_ROTATION_DEGREES, type TrackingPoint} from './types'

interface BodyLandmark extends TrackingPoint {
  readonly z: number
  readonly visibility?: number
  readonly presence?: number
}
interface CreateBodyPoseOptions {
  /** Normalized image landmarks; both shoulders must be visible inside the camera frame. */
  readonly landmarks: readonly BodyLandmark[]
  /** Matching world-space landmarks in meters, used to distinguish yaw from sideways lean. */
  readonly world: readonly BodyLandmark[]
}
const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12
const MINIMUM_CONFIDENCE = 0.6
const MINIMUM_WIDTH = 0.05
const HALF_CIRCLE = 180
const ROTATION_RADIANS = (POSE_ROTATION_DEGREES * Math.PI) / HALF_CIRCLE
const finite = (point: BodyLandmark | undefined): point is BodyLandmark =>
  point !== undefined && [point.x, point.y, point.z].every(Number.isFinite)
const visible = (point: BodyLandmark | undefined) =>
  finite(point) &&
  (point.visibility ?? 0) >= MINIMUM_CONFIDENCE &&
  (point.presence ?? 1) >= MINIMUM_CONFIDENCE &&
  point.x >= 0 &&
  point.x <= 1 &&
  point.y >= 0 &&
  point.y <= 1

/** Reads mirrored torso yaw independently from the head; unobservable shoulders return null. */
export const createBodyPose = (options: CreateBodyPoseOptions): TrackingPoint | null => {
  const left = options.world[LEFT_SHOULDER]
  const right = options.world[RIGHT_SHOULDER]
  if (
    !visible(options.landmarks[LEFT_SHOULDER]) ||
    !visible(options.landmarks[RIGHT_SHOULDER]) ||
    !finite(left) ||
    !finite(right)
  ) {
    return null
  }
  const horizontal = left.x - right.x
  const depth = left.z - right.z
  if (horizontal <= 0 || Math.hypot(horizontal, depth) < MINIMUM_WIDTH) {
    return null
  }
  const yaw = Math.atan2(depth, horizontal) / ROTATION_RADIANS
  return {x: yaw === 0 ? 0 : Math.max(-1, Math.min(1, yaw)), y: 0}
}
