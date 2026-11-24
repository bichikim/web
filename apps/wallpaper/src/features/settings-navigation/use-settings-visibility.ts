import {isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {createSignal, onCleanup, onMount} from 'solid-js'

/** Tracks the native window lifecycle even when another app covers the settings window. */
export const useSettingsVisibility = () => {
  const [visible, setVisible] = createSignal(!isTauri())
  onMount(() => {
    if (!isTauri()) {
      return
    }
    let disposed = false
    let stop: (() => void) | undefined
    let revision = 0
    onCleanup(() => {
      disposed = true
      stop?.()
    })
    const observe = async () => {
      const unlisten = await listen<boolean>('wallpaper-settings-visible', ({payload}) => {
        revision += 1
        setVisible(payload)
      })
      if (disposed) {
        unlisten()
        return
      }
      stop = unlisten
      const request = revision
      const initial = await getCurrentWindow().isVisible()
      if (!disposed && request === revision) {
        setVisible(initial)
      }
    }
    observe().catch((cause: unknown) => {
      console.error('Wallpaper settings visibility is unavailable', cause)
      if (!disposed && revision === 0) {
        setVisible(true)
      }
    })
  })
  return visible
}
