import {type Accessor, createEffect, createMemo, onCleanup, untrack} from 'solid-js'
import type {Player} from '@winter-love/puppet/player'
import type {AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'
import type {TrackingParameter} from '../tracking/types'
import {agentParameters} from './parameters'
import {useAgentSignals} from './use-agent-signals'
import {selectAgentActions} from './select-actions'
import {createActionPlayback} from '../semantics/action-playback'
import type {CharacterAction} from '../semantics/types'
import {useSemanticFrame} from '../semantics/use-semantic-frame'

interface UseAgentStateProps {
  /** Enabled content connections own response presentation; omission retains configured response behaviors. */
  readonly contentEnabled?: Accessor<boolean>
  /** Widget whose foremost bubble owns these states; omission leaves native widget states inactive. */
  readonly widgetId?: Accessor<string | undefined>
  /** Available character behaviors; omission keeps parameter-only connections. */
  readonly actions?: Accessor<readonly CharacterAction[]>
  /** Persisted state connections owned by this widget. */
  readonly bindings: Accessor<AgentStateBindings | undefined>
  /** Active player; replacing it releases this hook's action layers and parameter overrides. */
  readonly player: Accessor<Player | null>
  /** Supported numeric channels used to validate legacy parameter connections. */
  readonly parameters: Accessor<readonly TrackingParameter[]>
}
/** Applies the selected bubble's parameters and behaviors without owning gaze or lip channels. */
export const useAgentState = (props: UseAgentStateProps) => {
  const bindings = createMemo(() => props.bindings() ?? {}, undefined, {
    equals: (first, second) => JSON.stringify(first) === JSON.stringify(second),
  })
  const enabled = createMemo(
    () =>
      props.player() !== null &&
      Object.values(bindings()).some((binding) => binding?.parameterId || binding?.actions?.length),
  )
  const signals = useAgentSignals(enabled, props.widgetId)
  const frame = useSemanticFrame({enabled, widgetId: () => props.widgetId?.()})
  const activeSignals = createMemo(() => {
    const state = frame()?.agentPreview
    return state === undefined ? signals() : {[state]: true}
  })
  const contentOwns = createMemo(
    () =>
      frame()?.agentPreview === undefined &&
      (frame()?.previewId !== undefined ||
        (props.contentEnabled?.() === true && signals().response === true)),
  )
  const selected = createMemo(() =>
    contentOwns()
      ? []
      : selectAgentActions({
          actions: props.actions?.() ?? [],
          bindings: bindings(),
          signals: activeSignals(),
        }),
  )
  const reservedParameters = createMemo<ReadonlySet<string>>(() => {
    const state = frame()?.agentPreview
    const parameterId = state === undefined ? undefined : bindings()[state]?.parameterId
    return new Set([
      ...selected().flatMap((selection) => selection.action.parameterIds ?? []),
      ...(parameterId ? [parameterId] : []),
    ])
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
  const values = createMemo(
    () => (contentOwns() ? {} : agentParameters(props.parameters(), bindings(), activeSignals())),
    undefined,
    {
      equals: (first, second) => JSON.stringify(first) === JSON.stringify(second),
    },
  )
  createEffect(() => {
    const player = props.player()
    const mapped = values()
    const ids = Object.keys(mapped)
    if (player === null || ids.length === 0) {
      return
    }
    player.patchParameterValues(mapped)
    onCleanup(() => player.clearParameterValues(ids))
  })
  return {reservedParameters}
}
