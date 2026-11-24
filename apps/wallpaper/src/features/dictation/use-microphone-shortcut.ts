import {isTauri} from '@tauri-apps/api/core'
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow'
import {type Accessor, createEffect, onCleanup} from 'solid-js'

interface UseMicrophoneShortcutProps {
  /** Only the selected, available composer may handle a shortcut delivered to its window. */
  readonly enabled: Accessor<boolean>
  /** Handles the microphone action without changing desktop window focus. */
  readonly onToggle: () => void
}
/** Receives the native global shortcut in the targeted bubble window without registering extra keys. */
export const useMicrophoneShortcut = (props: UseMicrophoneShortcutProps) => {
  createEffect(() => {
    if (!isTauri()) {
      return
    }
    let disposed = false
    let stop: (() => void) | null = null
    const receive = () => {
      if (!disposed && props.enabled()) {
        props.onToggle()
      }
    }
    getCurrentWebviewWindow()
      .listen('poffo-microphone-toggle', receive)
      .then((unsubscribe) => {
        if (disposed) {
          unsubscribe()
        } else {
          stop = unsubscribe
        }
      })
      .catch((cause: unknown) => console.error('Poffo microphone shortcut unavailable', cause))
    onCleanup(() => {
      disposed = true
      stop?.()
    })
  })
}
