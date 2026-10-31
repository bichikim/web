import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {TrackingParameter} from '../tracking/types'

interface SemanticParametersOptions {
  readonly bindings: readonly SemanticBinding[]
  readonly scores: Readonly<Record<string, number>>
  readonly parameters: readonly TrackingParameter[]
}
export const semanticParameters = (
  options: SemanticParametersOptions,
): Readonly<Record<string, number>> => {
  const candidates = options.bindings
    .flatMap((binding) => {
      const parameter = options.parameters.find((item) => item.id === binding.parameterId)
      const score = options.scores[binding.id]
      return !binding.enabled ||
        parameter === undefined ||
        score === undefined ||
        !Number.isFinite(score) ||
        (binding.releaseWhenUnmatched === true && score < binding.threshold)
        ? []
        : [{binding, parameter, score}]
    })
    .toSorted(
      (first, second) =>
        Number(first.score >= first.binding.threshold) -
          Number(second.score >= second.binding.threshold) || first.score - second.score,
    )
  return Object.fromEntries(
    candidates.map(({binding, parameter, score}) => {
      const from = binding.from ?? parameter.defaultValue
      const to = binding.to ?? parameter.maximum
      const strength =
        binding.mode === 'toggle'
          ? Number(score >= binding.threshold)
          : Math.max(0, Math.min(1, (score - binding.threshold) / (1 - binding.threshold)))
      const value = from + (to - from) * strength
      return [parameter.id, Math.max(parameter.minimum, Math.min(parameter.maximum, value))]
    }),
  )
}
