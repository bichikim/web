import {useClientAsync} from '@winter-love/solid-use/client-async'
import * as m from '@paraglide/message'
import {createSignal} from 'solid-js'

export interface ImageSupportOptions {
  readonly onStatus: (status: string) => void
}

export const useImageSupport = (options: ImageSupportOptions) => {
  const [supported, setSupported] = createSignal(false)
  useClientAsync(
    () => Promise.resolve(globalThis.navigator.gpu?.requestAdapter()),
    (adapter) => {
      const available =
        adapter !== null && adapter !== undefined && adapter.features.has('shader-f16')
      setSupported(available)
      options.onStatus(
        available ? m.picture_diary_generation_ready() : m.picture_diary_generation_unsupported(),
      )
    },
    () => options.onStatus(m.picture_diary_generation_support_error()),
  )
  return supported
}
