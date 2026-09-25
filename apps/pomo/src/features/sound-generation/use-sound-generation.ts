import {getExceptionMessage} from 'src/features/error-detail'
import {replaceBlobObjectUrl} from 'src/features/blob-object-url'
import {createSignal, onCleanup} from 'solid-js'
import type {LoopRequest, SoundMessage, SoundRequest} from './worker'

const BUSY_ERROR_MESSAGE = '이미 생성 중인 작업이 있습니다. 완료 후 다시 시도해 주세요.'
export const MAX_REQUEST_SECONDS = 3600

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
    const currentError = error()
    if (currentError === BUSY_ERROR_MESSAGE) {
      setError(null)
    }
    setStatus('생성을 중지했습니다.')
  }
  onCleanup(() => {
    terminate()
    const previous = url()
    if (previous !== null) {
      URL.revokeObjectURL(previous)
    }
  })
  const generate = (request: SoundRequest | LoopRequest) => {
    if (busy()) {
      setError(BUSY_ERROR_MESSAGE)
      setStatus('생성이 진행 중입니다. 완료 후 다시 시도해 주세요.')
      return
    }
    if (
      !('type' in request) &&
      (!Number.isInteger(request.seconds) ||
        request.seconds < 1 ||
        request.seconds > MAX_REQUEST_SECONDS)
    ) {
      setError('생성 길이는 1–3,600초 사이의 정수로 입력해 주세요.')
      setStatus('생성 길이를 확인해 주세요.')
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
            setUrl(
              replaceBlobObjectUrl(url(), () => {
                setError(null)
                return message.blob
              }),
            )
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
      setError(getExceptionMessage(cause, () => String(cause)))
      setStatus('생성에 실패했습니다.')
      terminate()
    }
  }
  return {busy, error, generate, status, stop, url}
}
