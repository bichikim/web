import type {PuppetDocument} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import {
  getCoordinateIndex,
  isParameterTrack,
  sampleDiscreteKeyframes,
  sampleKeyframes,
} from '../internal/motion'
import {resolveParameterValue} from '../parameter-value'
import type {MotionBlend, MotionFrame} from './types'

interface MotionSample {
  readonly blend: MotionBlend
  readonly priority: number
  readonly value: number
  readonly weight: number
}

interface MixMotionFramesOptions {
  readonly document: PuppetDocument
  readonly frames: ReadonlyArray<MotionFrame>
  readonly parameterValues?: PuppetParameterValueMap
}

export interface MotionMix {
  readonly parameterValues: PuppetParameterValueMap
  readonly vertexSamples: ReadonlyMap<string, ReadonlyMap<number, ReadonlyArray<MotionSample>>>
}

interface MixMotionVerticesOptions {
  readonly partId: string
  readonly restVertices: ReadonlyArray<number>
  readonly samples: MotionMix['vertexSamples']
  readonly vertices: ArrayLike<number>
}

const mixReplacements = (samples: ReadonlyArray<MotionSample>, current: number) => {
  const maximumWeight = samples.reduce((maximum, sample) => Math.max(maximum, sample.weight), 0)
  if (maximumWeight === 0) {
    return current
  }
  const scaledWeight = samples.reduce((total, sample) => total + sample.weight / maximumWeight, 0)
  const contribution = Math.min(1, maximumWeight * scaledWeight)
  return (
    current * (1 - contribution) +
    samples.reduce(
      (total, sample) =>
        total + sample.value * (sample.weight / maximumWeight / scaledWeight) * contribution,
      0,
    )
  )
}

const mixSamples = (samples: ReadonlyArray<MotionSample>, initial: number, reference: number) => {
  const priorities = [...new Set(samples.map((sample) => sample.priority))].toSorted(
    (first, second) => first - second,
  )
  return priorities.reduce((current, priority) => {
    const layer = samples.filter((sample) => sample.priority === priority)
    const replacements = layer.filter((sample) => sample.blend === 'replace')
    const blend = mixReplacements(replacements, current)
    return layer
      .filter((sample) => sample.blend === 'add')
      .reduce((total, sample) => total + (sample.value - reference) * sample.weight, blend)
  }, initial)
}

export const mixMotionFrames = (options: MixMotionFramesOptions): MotionMix => {
  const parameters = new Map(
    options.document.parameters?.map((parameter) => [parameter.id, parameter]),
  )
  const parameterSamples = new Map<string, Array<MotionSample>>()
  const vertexSamples = new Map<string, Map<number, Array<MotionSample>>>()
  for (const frame of options.frames.filter((candidate) => candidate.weight > 0)) {
    for (const track of frame.motion.tracks.filter((candidate) => candidate.keyframes.length > 0)) {
      const parameter = isParameterTrack(track) ? parameters.get(track.parameterId) : undefined
      const value =
        parameter?.options === undefined
          ? sampleKeyframes(track.keyframes, frame.time)
          : sampleDiscreteKeyframes(track.keyframes, frame.time)
      const sample = {blend: frame.blend, priority: frame.priority, value, weight: frame.weight}
      if (isParameterTrack(track)) {
        parameterSamples.set(track.parameterId, [
          ...(parameterSamples.get(track.parameterId) ?? []),
          sample,
        ])
      } else {
        const coordinates =
          vertexSamples.get(track.partId) ?? new Map<number, Array<MotionSample>>()
        const coordinate = getCoordinateIndex(track)
        coordinates.set(coordinate, [...(coordinates.get(coordinate) ?? []), sample])
        vertexSamples.set(track.partId, coordinates)
      }
    }
  }
  const parameterValues = Object.fromEntries(
    [...parameters.values()].map((parameter) => {
      const sampled = mixSamples(
        parameterSamples.get(parameter.id) ?? [],
        parameter.defaultValue,
        parameter.defaultValue,
      )
      const overrides = options.parameterValues
      const value =
        overrides !== undefined && Object.hasOwn(overrides, parameter.id)
          ? overrides[parameter.id]
          : sampled
      return [parameter.id, resolveParameterValue(parameter, value)]
    }),
  )
  return {parameterValues, vertexSamples}
}

export const mixMotionVertices = (options: MixMotionVerticesOptions): ReadonlyArray<number> =>
  Array.from(options.vertices, (value, index) =>
    mixSamples(
      options.samples.get(options.partId)?.get(index) ?? [],
      value,
      options.restVertices[index] ?? value,
    ),
  )
