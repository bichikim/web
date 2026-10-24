import type {PuppetParameterValueMap} from '../deformation'
import type {PuppetDocument} from './document'
import {resolveParameterValue} from './parameter-value'

/** Where the model looks, `-1..1` on each axis (x right, y up), and how fast it is moving. */
export interface LookPoint {
  readonly vx: number
  readonly vy: number
  readonly x: number
  readonly y: number
}

export interface LookTarget {
  readonly x: number
  readonly y: number
}

export const LOOK_REST: LookPoint = {vx: 0, vy: 0, x: 0, y: 0}
/** Units per second the look point moves at most (a full sweep from center in 0.25 s). */
export const LOOK_MAXIMUM_SPEED = 4
/** Seconds to reach the maximum speed from rest; braking uses the same acceleration. */
export const LOOK_TIME_TO_MAXIMUM_SPEED = 0.15
const ACCELERATION = LOOK_MAXIMUM_SPEED / LOOK_TIME_TO_MAXIMUM_SPEED

const length = (x: number, y: number) => Math.sqrt(x * x + y * y)

const clampAxis = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(-1, value)) : 0)

/** The target limited to `-1..1` on each axis; the center when there is none. */
export const clampLookTarget = (target: LookTarget | undefined): LookTarget =>
  target === undefined ? {x: 0, y: 0} : {x: clampAxis(target.x), y: clampAxis(target.y)}

/**
 * Moves the look point toward `target` for `deltaTime` seconds with limited speed and
 * acceleration, slowing so it stops at the target (the role of Cubism's target point).
 */
export const advanceLookPoint = (
  point: LookPoint,
  target: LookTarget,
  deltaTime: number,
): LookPoint => {
  if (!(deltaTime > 0)) {
    return point
  }
  const [dx, dy] = [target.x - point.x, target.y - point.y]
  const distance = length(dx, dy)
  if (distance === 0) {
    return {...target, vx: 0, vy: 0}
  }
  // The fastest speed that can still brake to a stop at the target.
  const speed = Math.min(LOOK_MAXIMUM_SPEED, Math.sqrt(2 * ACCELERATION * distance))
  const [ax, ay] = [(dx / distance) * speed - point.vx, (dy / distance) * speed - point.vy]
  const change = length(ax, ay)
  const limit = ACCELERATION * deltaTime
  const scale = change > limit ? limit / change : 1
  const [vx, vy] = [point.vx + ax * scale, point.vy + ay * scale]
  return length(vx, vy) * deltaTime >= distance
    ? {...target, vx: 0, vy: 0}
    : {vx, vy, x: point.x + vx * deltaTime, y: point.y + vy * deltaTime}
}

/** Whether the point rests at the target. */
export const isLookSettled = (point: LookPoint, target: LookTarget) =>
  point.x === target.x && point.y === target.y && point.vx === 0 && point.vy === 0

/**
 * Adds each look parameter's `x · X + y · Y + xy · X · Y` for the look point `(X, Y)`, within its
 * range (Cubism's Look).
 */
export const applyLook = (
  document: PuppetDocument,
  values: PuppetParameterValueMap,
  point: LookTarget,
): PuppetParameterValueMap => {
  const next = {...values}
  for (const look of document.look ?? []) {
    const parameter = document.parameters?.find((candidate) => candidate.id === look.parameterId)
    if (parameter !== undefined) {
      const added = look.x * point.x + look.y * point.y + look.xy * point.x * point.y
      const current = values[parameter.id] ?? parameter.defaultValue
      next[parameter.id] = resolveParameterValue(parameter, current + added)
    }
  }
  return next
}
