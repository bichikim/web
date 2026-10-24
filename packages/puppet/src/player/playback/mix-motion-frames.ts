import type {PuppetDocument, PuppetParameter, PuppetTrack} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import {getCoordinateIndex, sampleDiscreteKeyframes, sampleKeyframes} from '../internal/motion'
import {resolveParameterValue} from '../parameter-value'
import {applyExpressionLayers, type ExpressionLayer} from './expression-playback'
import {getTrackFadeWeight} from './motion-fade'
import type {MotionBlend, MotionFrame} from './types'

interface MotionSample {
  readonly blend: MotionBlend
  readonly priority: number
  readonly value: number
  readonly weight: number
}

interface MixMotionFramesOptions {
  /** 모션 합성 전 값. 생략하면 각 파라미터의 기본값을 사용한다. */
  readonly baseParameterValues?: PuppetParameterValueMap
  readonly document: PuppetDocument
  /** Applied after motions and before external overrides. */
  readonly expressions?: ReadonlyArray<ExpressionLayer>
  /** Automatic eye blink's eye openness (0..1), set on the eye-blink parameters after motions. */
  readonly eyeOpenness?: number
  readonly frames: ReadonlyArray<MotionFrame>
  /** Model opacity before motions; 1 when omitted. */
  readonly modelOpacity?: number
  readonly parameterValues?: PuppetParameterValueMap
}

export interface MotionMix {
  /** 표현식·직접 입력·물리 효과를 제외한 이번 모션의 값. 다음 프레임의 기준으로 사용할 수 있다. */
  readonly motionParameterValues: PuppetParameterValueMap
  /** Group opacity samples, mixed over each group's own opacity by `mixGroupOpacity`. */
  readonly groupOpacitySamples: ReadonlyMap<string, ReadonlyArray<MotionSample>>
  readonly modelOpacity: number
  readonly parameterValues: PuppetParameterValueMap
  readonly vertexSamples: ReadonlyMap<string, ReadonlyMap<number, ReadonlyArray<MotionSample>>>
}

/** The range end farther from the default: where eye openness 0 puts an eye-blink parameter. */
const getClosedValue = (parameter: PuppetParameter) =>
  Math.abs(parameter.maximum - parameter.defaultValue) >
  Math.abs(parameter.minimum - parameter.defaultValue)
    ? parameter.maximum
    : parameter.minimum

/** An eye-blink parameter's value at `openness`, scaling its offset from the closed value. */
const openTo = (parameter: PuppetParameter, value: number, openness: number) => {
  const closed = getClosedValue(parameter)
  return closed + (value - closed) * openness
}

interface FrameModelCurve {
  readonly value: number
  readonly weight: number
}

/** A frame's eye-blink and lip-sync model curves, sampled with their fade weights. */
const getModelCurves = (frame: MotionFrame) => {
  const curve = (target: 'eye-blink' | 'lip-sync'): FrameModelCurve | undefined => {
    const track = frame.motion.tracks.find(
      (candidate): candidate is Extract<PuppetTrack, {kind: 'model'}> =>
        candidate.kind === 'model' && candidate.target === target && candidate.keyframes.length > 0,
    )
    return track === undefined
      ? undefined
      : {
          value: sampleKeyframes(track.keyframes, frame.time),
          weight: frame.weight * getTrackFadeWeight(frame, track),
        }
  }
  return {eyeBlink: curve('eye-blink'), lipSync: curve('lip-sync')}
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

const addSample = <Key>(map: Map<Key, Array<MotionSample>>, key: Key, sample: MotionSample) => {
  map.set(key, [...(map.get(key) ?? []), sample])
}

interface FrameMix {
  readonly groupOpacity: Map<string, Array<MotionSample>>
  readonly modelOpacity: Array<MotionSample>
  readonly parameters: Map<string, Array<MotionSample>>
  readonly vertices: Map<string, Map<number, Array<MotionSample>>>
}

/**
 * One frame's samples. Eye-blink and lip-sync model curves scale (eye openness) or offset
 * (lip sync) the frame's own curves on role parameters, and set role parameters it has none for.
 */
const mixFrame = (
  frame: MotionFrame,
  context: {
    readonly parameters: ReadonlyMap<string, PuppetParameter>
    readonly roles: {readonly eyeBlink: ReadonlySet<string>; readonly lipSync: ReadonlySet<string>}
  },
  mix: FrameMix,
) => {
  const model = getModelCurves(frame)
  const keyed = new Set<string>()
  const sampleOf = (value: number, track: PuppetTrack): MotionSample => ({
    blend: frame.blend,
    priority: frame.priority,
    value,
    weight: frame.weight * getTrackFadeWeight(frame, track),
  })
  for (const track of frame.motion.tracks.filter((candidate) => candidate.keyframes.length > 0)) {
    if (track.kind === 'parameter') {
      const parameter = context.parameters.get(track.parameterId)
      let value =
        parameter?.options === undefined
          ? sampleKeyframes(track.keyframes, frame.time)
          : sampleDiscreteKeyframes(track.keyframes, frame.time)
      if (
        parameter !== undefined &&
        model.eyeBlink !== undefined &&
        context.roles.eyeBlink.has(parameter.id)
      ) {
        value = openTo(parameter, value, model.eyeBlink.value)
      }
      if (model.lipSync !== undefined && context.roles.lipSync.has(track.parameterId)) {
        value += model.lipSync.value
      }
      keyed.add(track.parameterId)
      addSample(mix.parameters, track.parameterId, sampleOf(value, track))
    } else if (track.kind === 'vertex') {
      const coordinates = mix.vertices.get(track.partId) ?? new Map<number, Array<MotionSample>>()
      addSample(
        coordinates,
        getCoordinateIndex(track),
        sampleOf(sampleKeyframes(track.keyframes, frame.time), track),
      )
      mix.vertices.set(track.partId, coordinates)
    } else if (track.kind === 'group-opacity') {
      addSample(
        mix.groupOpacity,
        track.groupId,
        sampleOf(sampleKeyframes(track.keyframes, frame.time), track),
      )
    } else if (track.target === 'opacity') {
      mix.modelOpacity.push(sampleOf(sampleKeyframes(track.keyframes, frame.time), track))
    }
  }
  const setRoles = (
    ids: ReadonlySet<string>,
    curve: FrameModelCurve | undefined,
    valueOf: (parameter: PuppetParameter, value: number) => number,
  ) => {
    for (const id of ids) {
      const parameter = context.parameters.get(id)
      if (curve !== undefined && parameter !== undefined && !keyed.has(id)) {
        addSample(mix.parameters, id, {
          blend: 'replace',
          priority: frame.priority,
          value: valueOf(parameter, curve.value),
          weight: curve.weight,
        })
      }
    }
  }
  setRoles(context.roles.eyeBlink, model.eyeBlink, (parameter, openness) =>
    openTo(parameter, parameter.defaultValue, openness),
  )
  setRoles(context.roles.lipSync, model.lipSync, (_parameter, value) => value)
}

export const mixMotionFrames = (options: MixMotionFramesOptions): MotionMix => {
  const parameters = new Map(
    options.document.parameters?.map((parameter) => [parameter.id, parameter]),
  )
  const roles = {
    eyeBlink: new Set(options.document.parameterRoles?.eyeBlink ?? []),
    lipSync: new Set(options.document.parameterRoles?.lipSync ?? []),
  }
  const mix: FrameMix = {
    groupOpacity: new Map(),
    modelOpacity: [],
    parameters: new Map(),
    vertices: new Map(),
  }
  for (const frame of options.frames.filter((candidate) => candidate.weight > 0)) {
    mixFrame(frame, {parameters, roles}, mix)
  }
  const precision =
    options.document.motionParameterPrecision ??
    (options.document.motionParameterBase === 'previous-frame' ? 'float32' : 'float64')
  const motionValues = Object.fromEntries(
    [...parameters.values()].map((parameter) => {
      const value = mixSamples(
        mix.parameters.get(parameter.id) ?? [],
        resolveParameterValue(parameter, options.baseParameterValues?.[parameter.id]),
        parameter.defaultValue,
      )
      const blinking = options.eyeOpenness !== undefined && roles.eyeBlink.has(parameter.id)
      const posed = blinking
        ? openTo(parameter, parameter.defaultValue, options.eyeOpenness!)
        : value
      return [parameter.id, precision === 'float32' ? Math.fround(posed) : posed]
    }),
  )
  const sampledValues = applyExpressionLayers(
    [...parameters.values()],
    motionValues,
    options.expressions ?? [],
  )
  const parameterValues = Object.fromEntries(
    [...parameters.values()].map((parameter) => {
      const sampled = sampledValues[parameter.id]
      const overrides = options.parameterValues
      const value =
        overrides !== undefined && Object.hasOwn(overrides, parameter.id)
          ? overrides[parameter.id]
          : sampled
      return [parameter.id, resolveParameterValue(parameter, value)]
    }),
  )
  const baseOpacity = options.modelOpacity ?? 1
  return {
    groupOpacitySamples: mix.groupOpacity,
    modelOpacity: Math.min(1, Math.max(0, mixSamples(mix.modelOpacity, baseOpacity, baseOpacity))),
    motionParameterValues: Object.fromEntries(
      [...parameters.values()].map((parameter) => [
        parameter.id,
        resolveParameterValue(parameter, motionValues[parameter.id]),
      ]),
    ),
    parameterValues,
    vertexSamples: mix.vertices,
  }
}

/** A group's opacity with the motions' group-opacity tracks mixed over `opacity`. */
export const mixGroupOpacity = (mix: MotionMix | undefined, groupId: string, opacity: number) =>
  Math.min(
    1,
    Math.max(0, mixSamples(mix?.groupOpacitySamples.get(groupId) ?? [], opacity, opacity)),
  )

export const mixMotionVertices = (options: MixMotionVerticesOptions): ReadonlyArray<number> =>
  Array.from(options.vertices, (value, index) =>
    mixSamples(
      options.samples.get(options.partId)?.get(index) ?? [],
      value,
      options.restVertices[index] ?? value,
    ),
  )
