import * as m from '@paraglide/message'
import {createSignal, onCleanup, onMount} from 'solid-js'

export interface ImageSupportOptions {
  readonly onStatus: (status: string) => void
}

export const useImageSupport = (options: ImageSupportOptions) => {
  const [supported, setSupported] = createSignal(false)
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  onMount(() => {
    ;(async () => {
      try {
        const adapter = await navigator.gpu?.requestAdapter()
        const available =
          adapter !== null && adapter !== undefined && adapter.features.has('shader-f16')
        if (disposed) {
          return
        }
        setSupported(available)
        options.onStatus(
          available ? m.picture_diary_generation_ready() : m.picture_diary_generation_unsupported(),
        )
      } catch {
        if (!disposed) {
          options.onStatus(m.picture_diary_generation_support_error())
        }
      }
    })()
  })
  return supported
}
