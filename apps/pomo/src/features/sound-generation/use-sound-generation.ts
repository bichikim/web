import {createSignal, onCleanup} from 'solid-js'
import type {SoundMessage, SoundRequest} from './worker'

export function useSoundGeneration() {
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal(
    '첫 생성 시 모델 약 1.8GB를 다운로드합니다. 소리 설명은 서버로 전송하지 않습니다.',
  )
  const [error, setError] = createSignal<string | null>(null)
  const [url, setUrl] = createSignal<string | null>(null)
  let worker: Worker | null = null
  const terminate = () => {
    worker?.terminate()
    worker = null
    setBusy(false)
  }
  const stop = () => {
    terminate()
    setStatus('생성을 중지했습니다.')
  }
  onCleanup(() => {
    terminate()
    const previous = url()
    if (previous !== null) {
      URL.revokeObjectURL(previous)
    }
  })
  const generate = (request: SoundRequest) => {
    if (busy()) {
      return
    }
    setError(null)
    setBusy(true)
    setStatus('생성 환경을 확인하고 있어요…')
    try {
      const current = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
      worker = current
      current.onmessage = (event: MessageEvent<SoundMessage>) => {
        if (worker !== current) {
          return
        }
        const message = event.data
        switch (message.type) {
          case 'progress':
            setStatus(message.message)
            return
          case 'error':
            setError(message.message)
            setStatus('생성에 실패했습니다. 다시 시도할 수 있습니다.')
            terminate()
            return
          case 'result': {
            const previous = url()
            if (previous !== null) {
              URL.revokeObjectURL(previous)
            }
            setUrl(URL.createObjectURL(message.blob))
            setStatus('환경음 생성 완료')
            terminate()
            return
          }
        }
        message satisfies never
      }
      current.onerror = (event) => {
        if (worker !== current) {
          return
        }
        setError(event.message || '생성 실행기를 불러오지 못했습니다.')
        setStatus('생성에 실패했습니다.')
        terminate()
      }
      current.postMessage(request)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setStatus('생성에 실패했습니다.')
      terminate()
    }
  }
  return {busy, error, generate, status, stop, url}
}
