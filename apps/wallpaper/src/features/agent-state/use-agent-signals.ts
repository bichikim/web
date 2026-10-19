import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {AGENT_STATES, type AgentSignals} from '@winter-love/wallpaper/settings/agent-state'
import {readAgentSignals, subscribeAgentSignals} from './native'

/** Observes content-free state flags only while a consumer needs them. */
export const useAgentSignals = (enabled: Accessor<boolean> = () => true) => {
  const [signals, setSignals] = createSignal<AgentSignals>(
    {},
    {
      equals: (first, second) => AGENT_STATES.every(({value}) => first[value] === second[value]),
    },
  )
  createEffect(() => {
    if (!enabled()) {
      setSignals({})
      return
    }
    let disposed = false
    let revision = 0
    const initialRevision = revision
    let stop: (() => void) | undefined
    subscribeAgentSignals((value) => {
      if (!disposed) {
        revision += 1
        setSignals(value)
      }
    })
      .then(async (unsubscribe) => {
        if (disposed) {
          unsubscribe()
          return
        }
        stop = unsubscribe
        const initial = await readAgentSignals()
        if (!disposed && initialRevision === revision) {
          setSignals(initial)
        }
      })
      .catch((cause: unknown) => {
        if (!disposed) {
          console.error('Poffo agent state unavailable', cause)
        }
      })
    onCleanup(() => {
      disposed = true
      stop?.()
    })
  })
  return signals
}
