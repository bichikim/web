import type {
  PuppetDocument,
  PuppetKeyformSampling,
  PuppetParameterBinding,
  PuppetParameterInfluence,
} from '../player/document'
import {getRepeatRanges, resolveParameterValue} from '../player/parameter-value'
import type {PuppetParameterValueMap} from './composition'
import {sampleGridCoordinates} from './sample-grid-coordinates'

const DEFAULT_KEY_TOLERANCE = 0.0001

export interface GetBindingInfluenceOptions {
  /** 영향 곡선과 합성·샘플링 정책을 가진 바인딩. */
  readonly binding: PuppetParameterBinding
  /** 영향 곡선이 참조하는 파라미터의 범위와 기본값. */
  readonly document: PuppetDocument
  /** 현재 입력값. 생략한 파라미터는 문서의 기본값을 쓴다. */
  readonly parameterValues?: PuppetParameterValueMap
  /** 곱셈 격자의 이산 채널은 낮은 키를 유지한다. 생략하면 선형 보간한다. */
  readonly sampling?: 'step'
}

export const sampleInfluence = (
  relation: PuppetParameterInfluence,
  value: number,
  sampling?: PuppetKeyformSampling,
): number => {
  const rounded = sampling?.continuousPrecision === 'float32' ? Math.fround(value) : value
  const input =
    sampling?.keyToleranceUnit === 'parameter'
      ? (relation.points.find(
          (point) =>
            Math.abs(point.value - rounded) < (sampling.keyTolerance ?? DEFAULT_KEY_TOLERANCE),
        )?.value ?? rounded)
      : rounded
  const nextIndex = relation.points.findIndex((point) => point.value >= input)
  const next = relation.points[nextIndex]
  if (next === undefined) {
    return relation.points.at(-1)?.weight ?? 1
  }
  const previous = relation.points[nextIndex - 1]
  if (previous === undefined) {
    return next.weight
  }
  const progress = (input - previous.value) / (next.value - previous.value)
  return previous.weight + (next.weight - previous.weight) * progress
}

/** 입력 범위와 샘플링 정책에 맞춘 영향 곡선을 합성한다. 기본값은 최솟값이다. */
export const getBindingInfluence = (options: GetBindingInfluenceOptions): number => {
  let weight = 1
  for (const relation of options.binding.influences ?? []) {
    const parameter = options.document.parameters?.find(
      (candidate) => candidate.id === relation.parameterId,
    )
    if (parameter !== undefined) {
      const input = options.parameterValues?.[parameter.id]
      if (options.binding.influenceMode === 'multiply') {
        const [sampled = 1] = sampleGridCoordinates({
          binding: {
            keyforms: relation.points.map((point) => ({values: [point.value]})),
            parameterIds: [parameter.id],
            sampling: options.binding.sampling,
          },
          keyformCoordinates: relation.points.map((point) => [point.weight]),
          repeatRanges: getRepeatRanges([parameter.id], options.document.parameters),
          restCoordinates: [1],
          sampling: options.sampling,
          values: [resolveParameterValue(parameter, input)],
        })
        weight *= sampled
      } else {
        const value =
          input === undefined || !Number.isFinite(input)
            ? parameter.defaultValue
            : Math.max(parameter.minimum, Math.min(parameter.maximum, input))
        weight = Math.min(weight, sampleInfluence(relation, value, options.binding.sampling))
      }
    }
  }
  return weight
}
