import type {
  PuppetEasing,
  PuppetKeyframe,
  PuppetMotion,
  PuppetParameter,
  PuppetParameterTrack,
  PuppetTrack,
  PuppetVertexTrack,
} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'

export interface ApplyMotionVerticesOptions {
  readonly motion: PuppetMotion | undefined
  readonly partId: string
  readonly time: number
  readonly vertices: Float32Array | number[]
}

export interface SampleMotionVerticesOptions {
  readonly motion: PuppetMotion | undefined
  readonly partId: string
  readonly restVertices: ReadonlyArray<number>
  readonly time: number
}

export interface SampleMotionParameterValuesOptions {
  readonly motion: PuppetMotion | undefined
  readonly parameterValues?: PuppetParameterValueMap
  readonly parameters?: ReadonlyArray<PuppetParameter>
  readonly time: number
}

const COORDINATES_PER_VERTEX = 2
const Y_COORDINATE_OFFSET = 1
const EASING_MIDPOINT = 0.5
const CUBIC_EXPONENT = 3
const EASE_IN_OUT_SCALE = 4
const DOUBLE = 2
const CUBIC_WEIGHT = 3
const BEZIER_ITERATIONS = 40
const ONE_THIRD = 1 / CUBIC_WEIGHT
const TWO_THIRDS = DOUBLE / CUBIC_WEIGHT

type Bezier = readonly [number, number, number, number]

/** The cubic Bezier through `points` (start, two handles, end) at parameter `t`. */
const cubic = (points: readonly [number, number, number, number], t: number) => {
  const [start, first, second, end] = points
  const rest = 1 - t
  return (
    rest * rest * rest * start +
    CUBIC_WEIGHT * rest * rest * t * first +
    CUBIC_WEIGHT * rest * t * t * second +
    t * t * t * end
  )
}

/**
 * The value at `progress` (0..1 of the segment's time) on the cubic Bezier from `from` to `to`.
 * Handles are `[x1, y1, x2, y2]` with `x` in segment fractions; omitted, they are flat at one
 * third from each end. The curve's `t` is found by bisection, so `x(t) = progress` holds to
 * about 1e-12 and other runtimes reproduce it exactly.
 */
export const sampleBezier = (
  from: number,
  to: number,
  progress: number,
  handles: Bezier = [ONE_THIRD, from, TWO_THIRDS, to],
) => {
  const [x1, y1, x2, y2] = handles
  let low = 0
  let high = 1
  for (let iteration = 0; iteration < BEZIER_ITERATIONS; iteration += 1) {
    const middle = (low + high) / DOUBLE
    if (cubic([0, x1, x2, 1], middle) < progress) {
      low = middle
    } else {
      high = middle
    }
  }
  return cubic([from, y1, y2, to], (low + high) / DOUBLE)
}

/** Eased progress 0..1 of a segment from 0 to 1 (a `bezier` uses its default handles). */
export const easeProgress = (easing: PuppetEasing | undefined, progress: number) => {
  const activeEasing = easing ?? 'linear'

  switch (activeEasing) {
    case 'bezier':
      return sampleBezier(0, 1, progress)
    case 'stepped':
      return progress < 1 ? 0 : 1
    case 'inverse-stepped':
      return progress > 0 ? 1 : 0
    case 'ease-in':
      return progress ** CUBIC_EXPONENT
    case 'ease-in-out':
      return progress < EASING_MIDPOINT
        ? EASE_IN_OUT_SCALE * progress ** CUBIC_EXPONENT
        : 1 - (-DOUBLE * progress + DOUBLE) ** CUBIC_EXPONENT / DOUBLE
    case 'ease-out':
      return 1 - (1 - progress) ** CUBIC_EXPONENT
    case 'linear':
      return progress
    default: {
      const exhaustiveEasing: never = activeEasing
      return exhaustiveEasing
    }
  }
}

export const sampleKeyframes = (keyframes: ReadonlyArray<PuppetKeyframe>, time: number) => {
  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time >= time)

  if (nextIndex === -1) {
    return keyframes.at(-1)?.value ?? 0
  }

  if (nextIndex <= 0) {
    return keyframes[0]?.value ?? 0
  }

  const previousKeyframe = keyframes[nextIndex - 1]
  const nextKeyframe = keyframes[nextIndex]

  if (previousKeyframe === undefined || nextKeyframe === undefined) {
    return keyframes.at(-1)?.value ?? 0
  }

  const duration = nextKeyframe.time - previousKeyframe.time
  const progress = duration === 0 ? 0 : (time - previousKeyframe.time) / duration
  if (previousKeyframe.easing === 'bezier' && progress < 1) {
    return sampleBezier(
      previousKeyframe.value,
      nextKeyframe.value,
      progress,
      previousKeyframe.bezier,
    )
  }
  const easedProgress = easeProgress(previousKeyframe.easing, progress)

  return previousKeyframe.value + (nextKeyframe.value - previousKeyframe.value) * easedProgress
}

export const sampleDiscreteKeyframes = (keyframes: ReadonlyArray<PuppetKeyframe>, time: number) => {
  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time > time)
  return nextIndex === -1
    ? (keyframes.at(-1)?.value ?? 0)
    : (keyframes[Math.max(0, nextIndex - 1)]?.value ?? 0)
}

export const isParameterTrack = (track: PuppetTrack): track is PuppetParameterTrack =>
  track.kind === 'parameter'

export const isVertexTrack = (track: PuppetTrack): track is PuppetVertexTrack =>
  track.kind === 'vertex'

export const getCoordinateIndex = (track: PuppetVertexTrack) =>
  track.vertexIndex * COORDINATES_PER_VERTEX + (track.axis === 'y' ? Y_COORDINATE_OFFSET : 0)

export const applyMotionVertices = (options: ApplyMotionVerticesOptions) => {
  if (options.motion === undefined) {
    return
  }

  for (const track of options.motion.tracks) {
    if (isVertexTrack(track) && track.partId === options.partId) {
      options.vertices[getCoordinateIndex(track)] = sampleKeyframes(track.keyframes, options.time)
    }
  }
}

export const sampleMotionParameterValues = (
  options: SampleMotionParameterValuesOptions,
): PuppetParameterValueMap => {
  const values = {...options.parameterValues}
  const parameterById = new Map(options.parameters?.map((parameter) => [parameter.id, parameter]))

  for (const track of options.motion?.tracks ?? []) {
    if (isParameterTrack(track)) {
      const parameter = parameterById.get(track.parameterId)
      values[track.parameterId] =
        parameter?.options === undefined
          ? sampleKeyframes(track.keyframes, options.time)
          : sampleDiscreteKeyframes(track.keyframes, options.time)
    }
  }

  return values
}

export const sampleMotionVertices = (
  options: SampleMotionVerticesOptions,
): ReadonlyArray<number> => {
  const vertices = [...options.restVertices]
  applyMotionVertices({...options, vertices})
  return vertices
}
