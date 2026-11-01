import type {SemanticBinding, SemanticInput} from '@winter-love/wallpaper/settings/semantics'
import type {RandomActionSettings} from '@winter-love/wallpaper/settings/random-actions'
import {chooseRandomAction} from './select-actions'

interface RandomDrawOptions {
  /** Current narration and owning widget. */
  readonly input: SemanticInput
  /** Current semantic action bindings. */
  readonly bindings: readonly SemanticBinding[]
  /** Confirmed similarities for this input. */
  readonly scores: Readonly<Record<string, number>>
  /** Omitted disables random actions. */
  readonly settings?: RandomActionSettings
}
/** Keeps one draw, including a failed chance, per widget narration until explicitly cleared. */
export const createRandomDraws = (random: () => number) => {
  const draws = new Map<string, {readonly readoutId: string; readonly fallbackId?: string}>()
  return {
    clear: (widgetId: string) => draws.delete(widgetId),
    select: (options: RandomDrawOptions) => {
      const {input} = options
      const readoutId =
        input.narration?.phase === 'playing' ? input.narration.readoutId : input.readoutId
      if (readoutId === undefined) {
        return undefined
      }
      if (draws.get(input.widgetId)?.readoutId !== readoutId) {
        const fallbackId = chooseRandomAction({...options, random})
        draws.set(input.widgetId, {fallbackId, readoutId})
      }
      const selected = draws.get(input.widgetId)?.fallbackId
      return options.settings?.enabled && options.settings.bindingIds.includes(selected ?? '')
        ? selected
        : undefined
    },
  }
}
