import {type Accessor, createEffect, createMemo, onCleanup, untrack} from 'solid-js'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {CharacterAction, SemanticPlayer} from './types'
import {createActionPlayback} from './action-playback'
import {useSemanticFrame} from './use-semantic-frame'
import {selectSemanticActions} from './select-actions'

interface UseSemanticActionsProps {
  /** Channels owned by a higher-priority state behavior; omission leaves all semantic actions available. */
  readonly reservedParameters?: Accessor<ReadonlySet<string>>
  /** Widget providing live matching scores and manual execution requests. */
  readonly widgetId: Accessor<string | undefined>
  /** User's text-to-action connections; omitted means no semantic actions. */
  readonly bindings: Accessor<readonly SemanticBinding[] | undefined>
  /** Actions declared by the loaded character; unavailable targets do not execute. */
  readonly actions: Accessor<readonly CharacterAction[]>
  /** Current player; replaced players release their semantic actions. */
  readonly player: Accessor<SemanticPlayer | null>
}
export const useSemanticActions = (props: UseSemanticActionsProps) => {
  const current = useSemanticFrame({
    enabled: () => props.bindings()?.some((binding) => binding.enabled) ?? false,
    widgetId: props.widgetId,
  })
  const selected = createMemo(() => {
    const selections = selectSemanticActions({
      actions: props.actions(),
      bindings: props.bindings() ?? [],
      frame: current(),
    })
    const reserved = props.reservedParameters?.()
    const blocked = new Set(
      selections
        .filter((selection) => selection.action.parameterIds?.some((id) => reserved?.has(id)))
        .map((selection) => selection.group),
    )
    return selections.filter((selection) => !blocked.has(selection.group))
  })
  createEffect(() => {
    const player = props.player()
    if (player === null) {
      return
    }
    const playback = createActionPlayback(player)
    createEffect(() => {
      const selections = selected()
      untrack(() => playback.sync(selections))
    })
    onCleanup(playback.dispose)
  })
}
