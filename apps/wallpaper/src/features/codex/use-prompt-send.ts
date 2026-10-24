import {createSignal, onCleanup} from 'solid-js'
import type {CodexPort} from './types'
import {codexPort} from './native'

interface UsePromptSendProps {
  readonly sessionId: () => string
  readonly send?: () => CodexPort['sendPrompt']
}
export const usePromptSend = (props: UsePromptSendProps) => {
  const [draft, setDraft] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const edit = (value: string) => {
    if (!busy()) {
      setDraft(value)
    }
  }
  const send = async () => {
    const operation = props.send?.() ?? codexPort.sendPrompt
    if (busy() || !draft().trim() || operation === undefined) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await operation(props.sessionId(), draft())
      if (!disposed) {
        setDraft('')
      }
    } catch {
      if (!disposed) {
        setError('전송하지 못했습니다. Codex 연결을 확인해 주세요.')
      }
    } finally {
      if (!disposed) {
        setBusy(false)
      }
    }
  }
  return {busy, draft, edit, error, send}
}
