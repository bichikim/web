import type {SemanticBinding, SemanticFrame} from '@winter-love/wallpaper/settings/semantics'
import type {RandomActionSettings} from '@winter-love/wallpaper/settings/random-actions'
import {semanticTargets} from '@winter-love/wallpaper/settings/semantic-targets'
import type {CharacterAction, SemanticSelection} from './types'

interface SelectSemanticActionsOptions {
  /** Current configured bindings; absent groups share the default group. */
  readonly bindings: readonly SemanticBinding[]
  /** Available character actions; missing targets are ignored. */
  readonly actions: readonly CharacterAction[]
  /** Latest frame; manual preview takes precedence over automatic and random output. */
  readonly frame: SemanticFrame | null
}
export const selectSemanticActions = (
  options: SelectSemanticActionsOptions,
): readonly SemanticSelection[] => {
  const winners: SemanticSelection[] = []
  const groups = new Set<string>()
  const {frame} = options
  const ended = frame?.narration?.phase === 'ended' && frame.previewId === undefined
  const bindings = options.bindings.filter(
    (binding) => binding.enabled && semanticTargets(binding).length > 0,
  )
  const matched = bindings.filter(
    (binding) =>
      binding.category !== 'behavior' && (frame?.scores[binding.id] ?? -1) >= binding.threshold,
  )
  const candidates =
    frame?.previewId === undefined
      ? matched.length > 0
        ? matched
        : bindings.filter(
            (binding) => binding.category === 'behavior' && binding.id === frame?.fallbackId,
          )
      : bindings.filter((binding) => binding.id === frame.previewId)
  for (const binding of candidates.toSorted(
    (first, second) => (frame?.scores[second.id] ?? -1) - (frame?.scores[first.id] ?? -1),
  )) {
    const actions = semanticTargets(binding).flatMap((target) =>
      options.actions.filter(
        (item) => item.action.kind === target.kind && item.action.id === target.id,
      ),
    )
    const group = binding.exclusiveGroup?.trim() || '기본 그룹'
    if (actions.length > 0 && !groups.has(group)) {
      groups.add(group)
      if (!ended || binding.release === 'next-speech') {
        winners.push(...actions.map((action) => ({action, group})))
      }
    }
  }
  return winners
}
interface ChooseRandomActionOptions {
  /** Current connections; only enabled behavior actions are eligible. */
  readonly bindings: readonly SemanticBinding[]
  /** Confirmed model scores; an emotion or context match blocks a fallback. */
  readonly scores: Readonly<Record<string, number>>
  /** Fallback settings; omitted disables the draw. */
  readonly settings?: RandomActionSettings
  /** Supplies independent uniform samples in [0,1) for chance and candidate selection. */
  readonly random: () => number
}
export const chooseRandomAction = (options: ChooseRandomActionOptions): string | undefined => {
  const {settings} = options
  if (
    !settings?.enabled ||
    options.bindings.some(
      (binding) =>
        binding.enabled &&
        semanticTargets(binding).length > 0 &&
        binding.category !== 'behavior' &&
        (options.scores[binding.id] ?? -1) >= binding.threshold,
    )
  ) {
    return undefined
  }
  const candidates = options.bindings.filter(
    (binding) =>
      binding.enabled && binding.category === 'behavior' && semanticTargets(binding).length > 0,
  )
  if (
    candidates.length === 0 ||
    settings.probability === 0 ||
    options.random() >= settings.probability
  ) {
    return undefined
  }
  return candidates[Math.floor(options.random() * candidates.length)]?.id
}
