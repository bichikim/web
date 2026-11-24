import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {codexConversation, type CodexModel} from './codex'

/** Discovers account-visible models without changing the saved selection. */
export const useCodexModels = (enabled: Accessor<boolean>) => {
  const [models, setModels] = createSignal<readonly CodexModel[] | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [revision, setRevision] = createSignal(0)
  const retry = () => setRevision((value) => value + 1)
  createEffect(() => {
    revision()
    if (!enabled()) {
      setModels(null)
      setLoading(false)
      setError(null)
      return
    }
    let disposed = false
    setLoading(true)
    setError(null)
    codexConversation
      .models()
      .then((value) => {
        if (!disposed) {
          setModels(value)
        }
      })
      .catch((cause: unknown) => {
        if (!disposed) {
          setModels(null)
          setError(cause instanceof Error ? cause.message : 'Codex 모델을 불러오지 못했어요.')
        }
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false)
        }
      })
    globalThis.window?.addEventListener('focus', retry)
    onCleanup(() => {
      disposed = true
      globalThis.window?.removeEventListener('focus', retry)
    })
  })
  return {error, loading, models, retry}
}
