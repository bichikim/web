import {
  isThreeDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValues,
  withKeyformValues,
} from '../../deformation'
import type {PuppetParameter, PuppetParameterBinding, PuppetSceneDeformerNode} from '../../player'
import {blendKeyformDeltas} from './blend-keyform-deltas'
import {getKeyformPlaneValues} from './keyform-grid'
import {
  getKeyformGenerationContext,
  type KeyformGenerationResult,
  type KeyformGenerationTarget,
  replaceGeneratedKeyforms,
  sampleBindingKeyform,
} from './keyform-generation'

export interface CornerKeyformSettings {
  readonly overwrite: boolean
  /** For a 3D binding: the plane nearest the current third value, or every plane. */
  readonly planes?: 'current' | 'all'
  readonly reference?: 'default' | 'middle'
}
interface GenerateCornerKeyformsOptions extends KeyformGenerationTarget, CornerKeyformSettings {
  /** The current third value of a 3D binding. */
  readonly plane?: number
}

interface PlaneCornersOptions {
  readonly binding: PuppetParameterBinding
  readonly center: readonly [number, number]
  readonly deformers: ReadonlyArray<PuppetSceneDeformerNode>
  readonly generation: GenerateCornerKeyformsOptions
  readonly parameters: readonly [PuppetParameter, PuppetParameter]
}

const exists = (binding: PuppetParameterBinding, values: PuppetParameterValues) =>
  binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, values))

/**
 * The corners of one plane (the whole binding when `plane` is undefined), each the center plus
 * the deltas of its two axial forms; an error message when a reference form is missing.
 */
const getPlaneCorners = (options: PlaneCornersOptions, plane: number | undefined) => {
  const {binding, generation} = options
  const [x, y] = options.parameters
  const [centerX, centerY] = options.center
  const at = (first: number, second: number): PuppetParameterValues =>
    plane === undefined ? [first, second] : [first, second, plane]
  const required = [
    at(centerX, centerY),
    at(x.minimum, centerY),
    at(x.maximum, centerY),
    at(centerX, y.minimum),
    at(centerX, y.maximum),
  ]
  if (required.some((values) => !exists(binding, values))) {
    return plane === undefined
      ? '기준과 상하좌우 끝값의 키폼 5개를 먼저 만드세요.'
      : `평면 ${plane}에 기준과 상하좌우 끝값의 키폼 5개를 먼저 만드세요.`
  }
  const sample = (values: PuppetParameterValues) =>
    sampleBindingKeyform(generation, binding, values, options.deformers)
  const base = sample(at(centerX, centerY))
  return [y.minimum, y.maximum]
    .flatMap((vertical) => [x.minimum, x.maximum].map((horizontal) => at(horizontal, vertical)))
    .filter((values) => generation.overwrite || !exists(binding, values))
    .map((values) =>
      withKeyformValues(
        blendKeyformDeltas(
          sample(at(values[0], centerY)),
          sample(at(centerX, values[1] ?? centerY)),
          base,
        ),
        values,
      ),
    )
}

/** 모든 기존 단면 또는 현재의 정확한 Z 단면을 선택한다. */
const getPlanes = (binding: PuppetParameterBinding, options: GenerateCornerKeyformsOptions) => {
  if (!isThreeDimensionalParameterBinding(binding)) {
    return [undefined]
  }
  const planes = getKeyformPlaneValues(binding)
  if (options.planes === 'all') {
    return planes
  }
  return [options.plane ?? 0]
}

/** 선택한 단면의 기준·상하좌우 키폼에서 없거나 덮어쓰기로 지정한 모서리를 생성한다. */
export const generateCornerKeyforms = (
  options: GenerateCornerKeyformsOptions,
): KeyformGenerationResult => {
  const context = getKeyformGenerationContext(options)
  if (!context.ok) {
    return context
  }
  const {binding, parameters, deformers} = context
  const [x, y] = parameters
  if (binding.parameterIds.length < 2 || x === undefined || y === undefined) {
    return {message: '2차원 이상 파라미터를 선택하세요.', ok: false}
  }
  const middle = options.reference === 'middle'
  const center = [
    middle ? (x.minimum + x.maximum) / 2 : x.defaultValue,
    middle ? (y.minimum + y.maximum) / 2 : y.defaultValue,
  ] as const
  if (
    !(
      center[0] > x.minimum &&
      center[0] < x.maximum &&
      center[1] > y.minimum &&
      center[1] < y.maximum
    )
  ) {
    return {message: '기준값은 각 파라미터 범위 안쪽에 있어야 합니다.', ok: false}
  }
  const corners = getPlanes(binding, options).map((plane) =>
    getPlaneCorners({binding, center, deformers, generation: options, parameters: [x, y]}, plane),
  )
  const failure = corners.find((result) => typeof result === 'string')
  if (failure !== undefined) {
    return {message: failure, ok: false}
  }
  const generated = corners.flatMap((result) => (typeof result === 'string' ? [] : result))
  if (generated.length === 0) {
    return {message: '네 모서리에 이미 키폼이 있습니다. 덮어쓰기를 선택하세요.', ok: false}
  }
  return replaceGeneratedKeyforms(options, binding, generated)
}
