import type {
  PuppetEasing,
  PuppetKeyframe,
  PuppetMotion,
  PuppetParameterTrack,
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
  readonly time: number
}

const COORDINATES_PER_VERTEX = 2
const Y_COORDINATE_OFFSET = 1
const EASING_MIDPOINT = 0.5
const CUBIC_EXPONENT = 3
const EASE_IN_OUT_SCALE = 4
const DOUBLE = 2

const easeProgress = (easing: PuppetEasing | undefined, progress: number) => {
  const activeEasing = easing ?? 'linear'

  switch (activeEasing) {
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

const sampleKeyframes = (keyframes: ReadonlyArray<PuppetKeyframe>, time: number) => {
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
  const easedProgress = easeProgress(previousKeyframe.easing, progress)

  return previousKeyframe.value + (nextKeyframe.value - previousKeyframe.value) * easedProgress
}

export const isParameterTrack = (
  track: PuppetParameterTrack | PuppetVertexTrack,
): track is PuppetParameterTrack => 'parameterId' in track

const getCoordinateIndex = (track: PuppetVertexTrack) =>
  track.vertexIndex * COORDINATES_PER_VERTEX + (track.axis === 'y' ? Y_COORDINATE_OFFSET : 0)

export const applyMotionVertices = (options: ApplyMotionVerticesOptions) => {
  if (options.motion === undefined) {
    return
  }

  for (const track of options.motion.tracks) {
    if (!isParameterTrack(track) && track.partId === options.partId) {
      options.vertices[getCoordinateIndex(track)] = sampleKeyframes(track.keyframes, options.time)
    }
  }
}

export const sampleMotionParameterValues = (
  options: SampleMotionParameterValuesOptions,
): PuppetParameterValueMap => {
  const values = {...options.parameterValues}

  for (const track of options.motion?.tracks ?? []) {
    if (isParameterTrack(track)) {
      values[track.parameterId] = sampleKeyframes(track.keyframes, options.time)
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
