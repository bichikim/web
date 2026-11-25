import {type Accessor, createEffect} from 'solid-js'
import {selectAgentSession} from './native'

/** Tracks the foremost session on a bubble surface; unavailable surfaces leave native selection untouched. */
export const useAgentSelection = (
  sessionId: Accessor<string | null>,
  available: Accessor<boolean> = () => true,
) => {
  createEffect(() => {
    if (available()) {
      selectAgentSession(sessionId()).catch((cause: unknown) =>
        console.error('Speech selection delivery failed', cause),
      )
    }
  })
}
