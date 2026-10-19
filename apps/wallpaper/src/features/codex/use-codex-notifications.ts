import {batch, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import type {CodexActivity, CodexPort, CodexSnapshot} from './types'
import {codexPort} from './native'

const EMPTY: CodexSnapshot = {
  activity: null,
  received: false,
  recent: [],
  registered: false,
  sessions: [],
}
export const useCodexNotifications = (port: CodexPort = codexPort) => {
  const [raw, setRaw] = createSignal<CodexSnapshot>(EMPTY)
  const [loading, setLoading] = createSignal(port.available)
  const [hidden, setHidden] = createSignal<ReadonlyMap<string, number>>(new Map())
  const snapshot = createMemo<CodexSnapshot>(() => ({
    ...raw(),
    sessions: raw().sessions.filter((item) => hidden().get(item.sessionId) !== item.notificationId),
  }))
  const setSnapshot = (value: CodexSnapshot) =>
    batch(() => {
      setRaw(value)
      setLoading(false)
      if (!value.registered) {
        setHidden(new Map())
      }
    })
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  let revision = 0
  const report = (cause: unknown) => {
    if (!disposed) {
      console.error('Poffo Codex notifications failed', cause)
      setError('Codex 알림 연결을 확인해 주세요.')
    }
  }
  createEffect(() => {
    if (!port.available) {
      return
    }
    let stop: (() => void) | null = null
    const initialRevision = revision
    const receive = (value: CodexSnapshot) => {
      if (!disposed) {
        revision += 1
        setSnapshot(value)
      }
    }
    port
      .subscribe(receive)
      .then(async (unsubscribe) => {
        if (disposed) {
          unsubscribe()
          return
        }
        stop = unsubscribe
        const value = await port.read()
        if (!disposed && initialRevision === revision) {
          setSnapshot(value)
        }
      })
      .catch(report)
      .finally(() => {
        if (!disposed) {
          setLoading(false)
        }
      })
    onCleanup(() => {
      disposed = true
      stop?.()
    })
  })
  const change = async (operation: () => Promise<CodexSnapshot>) => {
    if (busy() || !port.available) {
      return
    }
    setBusy(true)
    setError(null)
    revision += 1
    const request = revision
    try {
      const value = await operation()
      if (!disposed && request === revision) {
        setSnapshot(value)
      }
    } catch (cause) {
      report(cause)
    } finally {
      if (!disposed) {
        setBusy(false)
      }
    }
  }
  const dismiss = async (activity: CodexActivity) => {
    const operation = port.dismiss
    if (operation === undefined) {
      return
    }
    revision += 1
    const request = revision
    setHidden((value) => new Map(value).set(activity.sessionId, activity.notificationId))
    try {
      const value = await operation(activity.sessionId, activity.notificationId)
      if (!disposed && revision === request) {
        setSnapshot(value)
      }
    } catch (cause) {
      if (!disposed) {
        setHidden((value) => {
          if (value.get(activity.sessionId) !== activity.notificationId) {
            return value
          }
          const next = new Map(value)
          next.delete(activity.sessionId)
          return next
        })
      }
      report(cause)
    }
  }
  return {
    available: port.available,
    busy,
    configureQuestions: (enabled: boolean) => {
      const operation = port.configureQuestions
      if (operation !== undefined) {
        return change(() => operation(enabled))
      }
    },
    connect: () => change(port.connect),
    disconnect: () => change(port.disconnect),
    dismiss: port.dismiss === undefined ? undefined : dismiss,
    error,
    loading,
    refresh: () => change(port.read),
    snapshot,
  }
}
