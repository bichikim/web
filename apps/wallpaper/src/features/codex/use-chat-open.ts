import {type Accessor, createSignal, onCleanup} from 'solid-js'
import type {CodexPort} from './types'

interface UseChatOpenProps {
  /** Returns the chat to reveal when the user invokes the action. */
  readonly sessionId: Accessor<string>
  /** Returns the opener at invocation time; undefined leaves the action unavailable. */
  readonly open: Accessor<CodexPort['openChat']>
}

export const useChatOpen = (props: UseChatOpenProps) => {
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const open = async () => {
    const operation = props.open()
    if (busy() || operation === undefined) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await operation(props.sessionId())
    } catch {
      if (!disposed) {
        setError('Codex에서 대화를 열지 못했어요.')
      }
    } finally {
      if (!disposed) {
        setBusy(false)
      }
    }
  }
  return {busy, error, open}
}
