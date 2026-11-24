import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {requestMicrophone, subscribeMicrophoneState} from './microphone-channel'
import type {MicrophoneDevice, MicrophoneState} from './types'
import {readMicrophones} from './read-microphones'
interface UseMicrophoneSettingsProps {
  /** Owner widget; omission keeps device discovery available without live telemetry. */
  readonly widgetId: Accessor<string | undefined>
  /** Enables discovery and subscriptions while microphone controls are visible. */
  readonly enabled: Accessor<boolean>
}

/** Lists inputs and observes the widget's existing capture without opening another microphone. */
export const useMicrophoneSettings = (props: UseMicrophoneSettingsProps) => {
  const [devices, setDevices] = createSignal<readonly MicrophoneDevice[]>([])
  const [state, setState] = createSignal<MicrophoneState | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  createEffect(() => {
    if (!props.enabled()) {
      return
    }
    const media = globalThis.navigator?.mediaDevices
    if (media?.enumerateDevices === undefined) {
      return
    }
    let disposed = false
    let remote = false
    let revision = 0
    const refresh = async () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      revision += 1
      const current = revision
      try {
        const inputs = await readMicrophones()
        if (!disposed && current === revision && !remote) {
          setDevices(inputs)
          setError(null)
        }
      } catch (cause) {
        if (!disposed && current === revision) {
          console.error('Microphone discovery failed', cause)
          setError('마이크 목록을 불러오지 못했어요.')
        }
      }
    }
    media.addEventListener('devicechange', refresh)
    document.addEventListener('visibilitychange', refresh)
    globalThis.addEventListener('focus', refresh)
    refresh()
    const widgetId = props.widgetId()
    let stop: (() => void) | undefined
    let listening = false
    if (widgetId !== undefined) {
      subscribeMicrophoneState(widgetId, (value) => {
        if (disposed) {
          return
        }
        setState(value)
        if (value.devices !== undefined) {
          remote = true
          setDevices(value.devices)
          setError(null)
        }
        if (value.phase === 'listening' && !listening) {
          refresh()
        }
        listening = value.phase === 'listening'
      })
        .then((unsubscribe) => {
          if (disposed) {
            unsubscribe()
          } else {
            stop = unsubscribe
            requestMicrophone({action: 'read', widgetId}).catch(console.error)
          }
        })
        .catch(console.error)
    }
    onCleanup(() => {
      disposed = true
      stop?.()
      media.removeEventListener('devicechange', refresh)
      document.removeEventListener('visibilitychange', refresh)
      globalThis.removeEventListener('focus', refresh)
      setState(null)
    })
  })
  const retry = () => {
    const widgetId = props.widgetId()
    if (widgetId !== undefined) {
      requestMicrophone({action: 'retry', widgetId}).catch(console.error)
    }
  }
  return {devices, error, retry, state}
}
