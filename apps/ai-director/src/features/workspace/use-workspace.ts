import {createSignal, onMount} from 'solid-js'

export type Method = 'lanczos' | 'spanf'
export interface Preview {
  readonly width: number
  readonly height: number
  readonly url: string
}
interface NativeBridge {
  core: {invoke: (command: string, payload?: Record<string, unknown>) => Promise<unknown>}
}
declare global {
  interface Window {
    __TAURI__?: NativeBridge
  }
}

const errorMessage = (error: unknown): string => {
  switch (error) {
    case 'image_too_large':
      return '4배 결과가 4천만 픽셀을 넘습니다. 더 작은 영역을 캡처해 주세요.'
    case 'invalid_image':
      return 'PNG, JPEG, WebP 이미지를 열어 주세요.'
    case 'capture_failed':
      return '캡처하지 못했습니다. macOS 설정에서 화면 기록 권한을 확인해 주세요.'
    case 'capture_unsupported':
      return '영역 캡처는 현재 macOS에서 지원합니다. 이미지 열기를 이용해 주세요.'
    case 'save_failed':
      return '저장하지 못했습니다. 저장 위치와 쓰기 권한을 확인해 주세요.'
    case 'unavailable':
      return '데스크톱 앱에서 실행해 주세요.'
    default:
      return '작업을 완료하지 못했습니다. 다시 시도해 주세요.'
  }
}

const isPreview = (value: unknown): value is Preview =>
  typeof value === 'object' &&
  value !== null &&
  'width' in value &&
  typeof value.width === 'number' &&
  'height' in value &&
  typeof value.height === 'number' &&
  'url' in value &&
  typeof value.url === 'string'

const invoke = async (command: string, payload?: Record<string, unknown>): Promise<unknown> => {
  const bridge = window.__TAURI__
  if (bridge === undefined) {
    throw new Error('unavailable')
  }
  return bridge.core.invoke(command, payload)
}
export const useWorkspace = () => {
  const [available, setAvailable] = createSignal(false)
  const [original, setOriginal] = createSignal<Preview | null>(null)
  const [result, setResult] = createSignal<Preview | null>(null)
  const [method, setMethod] = createSignal<Method>('lanczos')
  const [resultMethod, setResultMethod] = createSignal<Method>('lanczos')
  const [busy, setBusy] = createSignal(false)
  const [processing, setProcessing] = createSignal(false)
  const [message, setMessage] = createSignal('영역을 캡처하거나 이미지를 열어 시작하세요.')
  const [error, setError] = createSignal<string | null>(null)
  onMount(() => setAvailable(window.__TAURI__ !== undefined))

  const run = async (operation: () => Promise<void>) => {
    if (busy()) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await operation()
    } catch (cause) {
      setError(errorMessage(cause))
      setMessage('작업이 완료되지 않았습니다.')
    } finally {
      setBusy(false)
      setProcessing(false)
    }
  }
  const open = (capture: boolean) =>
    run(async () => {
      setMessage(capture ? '캡처할 영역을 드래그하세요. Esc로 취소합니다.' : '이미지를 선택하세요.')
      const value = await invoke(capture ? 'capture_image' : 'open_image')
      if (value === null) {
        setMessage('취소했습니다.')
        return
      }
      if (!isPreview(value)) {
        throw new Error('Invalid preview')
      }
      setOriginal(value)
      setResult(null)
      setMessage('확대 방식을 선택하고 4배 확대를 실행하세요.')
    })
  const upscale = () =>
    run(async () => {
      const selected = method()
      setProcessing(true)
      setMessage(
        selected === 'spanf' ? 'SPAN-F로 확대하고 있습니다…' : 'Lanczos로 확대하고 있습니다…',
      )
      const value = await invoke('upscale_image', {method: selected})
      if (value === null) {
        setMessage('확대를 취소했습니다.')
        return
      }
      if (!isPreview(value)) {
        throw new Error('Invalid preview')
      }
      setResult(value)
      setResultMethod(selected)
      setMessage('확대가 완료됐습니다. 원본과 비교하고 PNG로 저장하세요.')
    })
  const cancel = async () => {
    try {
      setMessage('작업을 중지하고 있습니다…')
      await invoke('cancel_upscale')
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }
  const save = () =>
    run(async () => {
      const saved = await invoke('save_image')
      setMessage(saved === true ? 'PNG를 저장했습니다.' : '저장을 취소했습니다.')
    })
  return {
    available,
    busy,
    cancel,
    error,
    message,
    method,
    open,
    original,
    processing,
    result,
    resultMethod,
    save,
    setMethod,
    upscale,
  }
}
