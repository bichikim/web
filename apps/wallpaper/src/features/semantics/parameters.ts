import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {TrackingParameter} from '../tracking/types'

export interface SemanticParametersOptions {
  /** Seconds since the matched gesture began; omitted samples the starting pose. */
  readonly elapsed?: number
  /** Configured mappings; a shared exclusive group selects one description and all its outputs. */
  readonly bindings: readonly SemanticBinding[]
  /** Similarities by binding ID; absent and nonfinite scores do not override the player. */
  readonly scores: Readonly<Record<string, number>>
  /** Available model parameters and their output bounds. */
  readonly parameters: readonly TrackingParameter[]
}
export interface SemanticMatch {
  readonly binding: SemanticBinding
  readonly parameter: TrackingParameter
  readonly score: number
}
export const semanticMatches = (options: SemanticParametersOptions): readonly SemanticMatch[] => {
  const winners = new Map<string, SemanticBinding>()
  for (const binding of options.bindings) {
    const group = binding.exclusiveGroup
    const score = options.scores[binding.id]
    if (
      group !== undefined &&
      binding.enabled &&
      binding.parameterId !== null &&
      options.parameters.some((parameter) => parameter.id === binding.parameterId) &&
      Number.isFinite(score) &&
      score >= binding.threshold
    ) {
      const previous = winners.get(group)
      if (previous === undefined || score > options.scores[previous.id]) {
        winners.set(group, binding)
      }
    }
  }
  const candidates = options.bindings
    .flatMap((binding) => {
      const parameter = options.parameters.find((item) => item.id === binding.parameterId)
      const score = options.scores[binding.id]
      return !binding.enabled ||
        parameter === undefined ||
        score === undefined ||
        !Number.isFinite(score) ||
        (binding.exclusiveGroup !== undefined &&
          winners.get(binding.exclusiveGroup)?.text !== binding.text) ||
        (binding.releaseWhenUnmatched === true && score < binding.threshold)
        ? []
        : [{binding, parameter, score}]
    })
    .toSorted(
      (first, second) =>
        Number(first.score >= first.binding.threshold) -
          Number(second.score >= second.binding.threshold) || first.score - second.score,
    )
  return candidates
}
export const semanticParameters = (
  options: SemanticParametersOptions,
): Readonly<Record<string, number>> =>
  Object.fromEntries(
    semanticMatches(options).flatMap(({binding, parameter, score}) => {
      const animation = score >= binding.threshold ? binding.animation : undefined
      const elapsed = Math.max(0, options.elapsed ?? 0)
      if (animation?.cycles !== undefined && elapsed >= animation.period * animation.cycles) {
        return []
      }
      const from = binding.from ?? parameter.defaultValue
      const to = binding.to ?? parameter.maximum
      const strength =
        binding.mode === 'toggle'
          ? Number(score >= binding.threshold)
          : Math.max(0, Math.min(1, (score - binding.threshold) / (1 - binding.threshold)))
      const progress =
        animation === undefined
          ? 1
          : (1 - Math.cos(Math.PI * 2 * (elapsed / animation.period + (animation.phase ?? 0)))) / 2
      const value = from + (to - from) * strength * progress
      return [[parameter.id, Math.max(parameter.minimum, Math.min(parameter.maximum, value))]]
    }),
  )
