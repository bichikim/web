import {type Accessor, createEffect, createMemo, onCleanup} from 'solid-js'
import type {Player} from '@winter-love/puppet/player'
import type {AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'
import type {TrackingParameter} from '../tracking/types'
import {agentParameters} from './parameters'
import {useAgentSignals} from './use-agent-signals'

interface UseAgentStateProps {
  readonly bindings: Accessor<AgentStateBindings | undefined>
  readonly player: Accessor<Player | null>
  readonly parameters: Accessor<readonly TrackingParameter[]>
}
/** Applies persistent on/off connections independently of bubble visibility and gaze/lip inputs. */
export const useAgentState = (props: UseAgentStateProps) => {
  const bindings = createMemo(() => props.bindings() ?? {}, undefined, {
    equals: (first, second) => JSON.stringify(first) === JSON.stringify(second),
  })
  const signals = useAgentSignals(
    () =>
      props.player() !== null && Object.values(bindings()).some((binding) => binding?.parameterId),
  )
  const values = createMemo(
    () => agentParameters(props.parameters(), bindings(), signals()),
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
}
