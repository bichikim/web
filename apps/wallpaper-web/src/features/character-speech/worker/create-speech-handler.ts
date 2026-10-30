import type {SpeechAudio, SpeechReply} from '../types'
import type {SpeechCommandHandler, SpeechEngine} from './types'

interface CreateSpeechHandlerOptions {
  /** 첫 요청에서 엔진을 초기화하고 다운로드 진행률을 전달한다. */
  readonly initialize: (onProgress: (percent: number) => void) => Promise<SpeechEngine>
  /** 합성한 PCM을 압축하며 지연된 로딩 후에도 취소 신호를 확인한다. */
  readonly encode: (audio: SpeechAudio, signal: AbortSignal) => Promise<Blob>
  /** 요청 ID를 포함한 상태·오디오·오류 응답을 전달한다. */
  readonly post: (message: SpeechReply) => void
  /** 취소를 제외한 요청 실패를 진단할 때 호출한다. */
  readonly onError: (cause: unknown) => void
}

interface SpeechRequest {
  readonly id: number
  readonly text: string
}

/** 요청을 순서대로 처리한다. 취소는 즉시 전달하며 초기화 성공 결과는 Worker 수명 동안 재사용한다. */
export const createSpeechHandler = (options: CreateSpeechHandlerOptions): SpeechCommandHandler => {
  const requests = new Map<number, AbortController>()
  let pending = Promise.resolve()
  let initialized: Promise<SpeechEngine> | null = null
  const generate = async (command: SpeechRequest, signal: AbortSignal) => {
    signal.throwIfAborted()
    if (initialized === null) {
      let reported = -1
      const onProgress = (percent: number) => {
        if (percent !== reported) {
          reported = percent
          options.post({id: command.id, status: {percent, phase: 'downloading'}, type: 'status'})
        }
      }
      onProgress(0)
      initialized = options.initialize(onProgress).catch((cause: unknown) => {
        initialized = null
        throw cause
      })
    }
    const engine = await initialized
    signal.throwIfAborted()
    options.post({id: command.id, status: {phase: 'generating'}, type: 'status'})
    const generated = await engine.generate(command.text, signal)
    signal.throwIfAborted()
    const audio = await options.encode(generated, signal)
    signal.throwIfAborted()
    options.post({audio, id: command.id, type: 'audio'})
  }
  return (command) => {
    switch (command.type) {
      case 'cancel':
        requests.get(command.id)?.abort()
        return
      case 'generate': {
        const request = new AbortController()
        requests.set(command.id, request)
        pending = pending
          .then(() => generate(command, request.signal))
          .catch((cause: unknown) => {
            if (!request.signal.aborted) {
              options.onError(cause)
              options.post({id: command.id, type: 'error'})
            }
          })
          .finally(() => requests.delete(command.id))
        return pending
      }
      default: {
        const unexpected: never = command
        throw new Error(`Unknown speech command: ${String(unexpected)}`)
      }
    }
  }
}
