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
          available
            ? '장면을 입력하고 이미지를 만들어 보세요.'
            : 'WebGPU와 shader-f16을 지원하는 브라우저·GPU가 필요해요.',
        )
      } catch {
        if (!disposed) {
          options.onStatus('WebGPU를 확인하지 못했어요. 브라우저의 GPU 설정을 확인해 주세요.')
        }
      }
    })()
  })
  return supported
}
