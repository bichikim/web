import {createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import type {CodexPort} from './types'
import {codexPort} from './native'

interface UsePromptSendProps {
  /** Returns the target chat; changing it starts a fresh draft. */
  readonly sessionId: () => string
  /** Returns the response identity that enables composing; omission waits until remount or failure. */
  readonly notificationId?: () => number | undefined
  /** Returns the delivery operation at submission; omission uses the native Codex connection. */
  readonly send?: () => CodexPort['sendPrompt']
}
export const usePromptSend = (props: UsePromptSendProps) => {
  const sessionId = createMemo(props.sessionId)
  const notificationId = createMemo(() => props.notificationId?.())
  const [draft, setDraft] = createSignal('')
  const [status, setStatus] = createSignal<'ready' | 'sending' | 'sent'>('ready')
  const busy = createMemo(() => status() === 'sending')
  const visible = createMemo(() => status() === 'ready')
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  let revision = 0
  createEffect(
    on([sessionId, notificationId], () => {
      revision += 1
      setDraft('')
      setError(null)
      setStatus('ready')
    }),
  )
  onCleanup(() => {
    disposed = true
  })
  const edit = (value: string) => {
    if (visible()) {
      setDraft(value)
    }
  }
  const send = async () => {
    const operation = props.send?.() ?? codexPort.sendPrompt
    const message = draft()
    if (!visible() || !message.trim() || operation === undefined) {
      return
    }
    const request = revision
    const target = sessionId()
    setStatus('sending')
    setError(null)
    try {
      await operation(target, message)
      if (!disposed && request === revision) {
        setDraft('')
        setStatus('sent')
      }
    } catch {
      if (!disposed && request === revision) {
        setError('전송하지 못했습니다. Codex 연결을 확인해 주세요.')
        setStatus('ready')
      }
    }
  }
  return {busy, draft, edit, error, send, visible}
}
