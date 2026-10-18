import {isTwoDimensionalParameterBinding, parameterValuesEqual} from '../../deformation'
import {blendKeyformDeltas} from './blend-keyform-deltas'
import {
  getKeyformGenerationContext,
  type KeyformGenerationResult,
  type KeyformGenerationTarget,
  replaceGeneratedKeyforms,
  sampleBindingKeyform,
} from './keyform-generation'

export interface CornerKeyformSettings {
  readonly overwrite: boolean
  readonly reference?: 'default' | 'middle'
}
interface GenerateCornerKeyformsOptions extends KeyformGenerationTarget, CornerKeyformSettings {}

/** Generates missing or explicitly replaceable corners from the center and four exact axial forms. */
export const generateCornerKeyforms = (
  options: GenerateCornerKeyformsOptions,
): KeyformGenerationResult => {
  const context = getKeyformGenerationContext(options)
  if (!context.ok) {
    return context
  }
  const {binding, parameters, deformers} = context
  if (!isTwoDimensionalParameterBinding(binding)) {
    return {message: '2차원 파라미터를 선택하세요.', ok: false}
  }
  const x = parameters[0]!
  const y = parameters[1]!
  const centerX = options.reference === 'middle' ? (x.minimum + x.maximum) / 2 : x.defaultValue
  const centerY = options.reference === 'middle' ? (y.minimum + y.maximum) / 2 : y.defaultValue
  const center = [centerX, centerY] as const
  if (!(centerX > x.minimum && centerX < x.maximum && centerY > y.minimum && centerY < y.maximum)) {
    return {message: '기준값은 각 파라미터 범위 안쪽에 있어야 합니다.', ok: false}
  }
  const required = [
    center,
    [x.minimum, centerY],
    [x.maximum, centerY],
    [centerX, y.minimum],
    [centerX, y.maximum],
  ]
  if (
    required.some(
      (values) => !binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, values)),
    )
  ) {
    return {message: '기준과 상하좌우 끝값의 키폼 5개를 먼저 만드세요.', ok: false}
  }
  const corners = [y.minimum, y.maximum].flatMap((vertical) =>
    [x.minimum, x.maximum].map((horizontal) => [horizontal, vertical] as const),
  )
  const destinations = corners.filter(
    (values) =>
      options.overwrite ||
      !binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, values)),
  )
  if (destinations.length === 0) {
    return {message: '네 모서리에 이미 키폼이 있습니다. 덮어쓰기를 선택하세요.', ok: false}
  }
  const base = sampleBindingKeyform(options, binding, center, deformers)
  const generated = destinations.map((values) => ({
    ...blendKeyformDeltas(
      sampleBindingKeyform(options, binding, [values[0], centerY], deformers),
      sampleBindingKeyform(options, binding, [centerX, values[1]], deformers),
      base,
    ),
    values,
  }))
  return replaceGeneratedKeyforms(options, binding, generated)
}
