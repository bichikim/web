import type {QwenWorkerRequest, QwenWorkerResponse} from './messages'
import type {QwenModelId} from './model'

export interface CreateQwenClientOptions {
  readonly modelId: QwenModelId
  readonly onResponse: (response: QwenWorkerResponse) => void
}

export interface QwenClient {
  readonly dispose: () => void
  readonly generate: (request: string) => void
  readonly prepare: () => void
}

/** Owns one Qwen Worker and translates its browser events into feature messages. */
export const createQwenClient = (options: CreateQwenClientOptions): QwenClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-qwen-dialogue',
    type: 'module',
  })
  const sendRequest = (request: QwenWorkerRequest) => worker.postMessage(request)

  worker.addEventListener('message', (event: MessageEvent<QwenWorkerResponse>) => {
    options.onResponse(event.data)
  })
  worker.addEventListener('error', (event) => {
    options.onResponse({
      message: event.message || 'Qwen Worker 실행 오류',
      restartRequired: true,
      type: 'error',
    })
  })

  return {
    dispose: () => worker.terminate(),
    generate: (request) => sendRequest({modelId: options.modelId, request, type: 'generate'}),
    prepare: () => sendRequest({modelId: options.modelId, type: 'prepare'}),
  }
}
