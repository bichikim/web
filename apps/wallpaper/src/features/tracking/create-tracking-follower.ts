import {smoothTrackingPoint} from '@winter-love/wallpaper/tracking/smooth-point'
import type {TrackingPoint} from './types'

interface CreateTrackingFollowerOptions {
  /** Adds a second, delayed body response; omission keeps body and gaze together. */
  readonly body?: boolean
  /** Body follow speed multiplier; omission uses 1. Gaze timing remains unchanged. */
  readonly bodySpeed?: number
  /** Head follow speed multiplier; omission retains the original response of 1. */
  readonly headSpeed?: number
  /** Eye follow speed multiplier; omission retains the original response of 1. */
  readonly eyeSpeed?: number
  /** Receives independent head, body and eye directions until all connected inputs settle. */
  readonly onChange: (head: TrackingPoint, body: TrackingPoint, eyes: TrackingPoint) => void
}
const FRAMES_PER_SECOND = 60
const FRAME_SECONDS = 1 / FRAMES_PER_SECOND
const MILLISECONDS_PER_SECOND = 1000
const bounded = (value: number) => (Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0)
const samePoint = (first: TrackingPoint | null, second: TrackingPoint | null) =>
  first === second ||
  (first !== null &&
    second !== null &&
    first.x === second.x &&
    first.y === second.y &&
    (first.z ?? 0) === (second.z ?? 0))

/** Follows input changes until settled; the caller must dispose its owned animation frame. */
export const createTrackingFollower = (options: CreateTrackingFollowerOptions) => {
  let disposed = false
  let target: TrackingPoint | null = null
  let eyeTarget: TrackingPoint = {x: 0, y: 0}
  let bodyTarget: TrackingPoint | null = null
  let current: TrackingPoint = {x: 0, y: 0}
  let eyes: TrackingPoint = {x: 0, y: 0}
  let body: TrackingPoint = {x: 0, y: 0}
  let frame = 0
  let previous: number | null = null
  const step = (timestamp: number) => {
    frame = 0
    if (disposed || target === null) {
      return
    }
    const seconds =
      previous === null ? FRAME_SECONDS : (timestamp - previous) / MILLISECONDS_PER_SECOND
    previous = timestamp
    const tilt = smoothTrackingPoint(
      {x: current.z ?? 0, y: 0},
      {x: target.z ?? 0, y: 0},
      seconds,
      options.headSpeed,
    ).x
    current = {
      ...smoothTrackingPoint(current, target, seconds, options.headSpeed),
      ...(target.z === undefined ? {} : {z: tilt}),
    }
    eyes = smoothTrackingPoint(eyes, eyeTarget, seconds, options.eyeSpeed)
    const torso = bodyTarget ?? current
    body = options.body
      ? {x: smoothTrackingPoint(body, torso, seconds, options.bodySpeed).x, y: torso.y}
      : torso
    options.onChange(current, body, eyes)
    if (
      current.x !== target.x ||
      current.y !== target.y ||
      (current.z ?? 0) !== (target.z ?? 0) ||
      body.x !== torso.x ||
      body.y !== torso.y ||
      eyes.x !== eyeTarget.x ||
      eyes.y !== eyeTarget.y
    ) {
      frame = requestAnimationFrame(step)
    } else {
      previous = null
    }
  }
  // An observed body target follows its own speed; omission retains delayed head following.
  const follow = (
    point: TrackingPoint,
    eyePoint: TrackingPoint = point,
    bodyPoint?: TrackingPoint,
  ) => {
    if (disposed) {
      return
    }
    const next = {
      x: bounded(point.x),
      y: bounded(point.y),
      ...(point.z === undefined ? {} : {z: bounded(point.z)}),
    }
    const nextEye = {x: bounded(eyePoint.x), y: bounded(eyePoint.y)}
    const nextBody =
      bodyPoint === undefined ? null : {x: bounded(bodyPoint.x), y: bounded(bodyPoint.y)}
    if (
      !samePoint(next, target) ||
      !samePoint(nextEye, eyeTarget) ||
      !samePoint(nextBody, bodyTarget)
    ) {
      target = next
      eyeTarget = nextEye
      bodyTarget = nextBody
      if (frame === 0) {
        frame = requestAnimationFrame(step)
      }
    }
  }
  const dispose = () => {
    disposed = true
    cancelAnimationFrame(frame)
  }
  return {dispose, follow}
}
