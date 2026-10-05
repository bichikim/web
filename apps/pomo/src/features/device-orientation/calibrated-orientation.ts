import {getOrientationAxes, type OrientationAxes} from './axes'

export interface OrientationReference {
  readonly angle: number
  readonly axes: OrientationAxes
}

export interface CalibratedOrientation {
  readonly axes: OrientationAxes
  readonly delta: OrientationAxes
  readonly reference: OrientationReference
}

/** Calibrates screen-adjusted sensor axes against the first valid sample after each rotation. */
export const getCalibratedOrientation = (
  beta: number | null,
  gamma: number | null,
  angle: number,
  reference: OrientationReference | null,
): CalibratedOrientation | null => {
  const axes = getOrientationAxes(beta, gamma, angle)
  if (axes === null) {
    return null
  }
  const baseline = reference?.angle === angle ? reference.axes : axes
  return {
    axes,
    delta: {x: axes.x - baseline.x, y: axes.y - baseline.y},
    reference: {angle, axes: baseline},
  }
}
