import {createWorkerTransport} from 'src/utils/worker-transport'
import {createWorkerFailureHandler} from '../worker-failure'
import type {TarotGenerateRequest, TarotWorkerRequest, TarotWorkerResponse} from './messages'

export interface CreateTarotClientOptions {
  readonly onResponse: (response: TarotWorkerResponse) => void
}

export interface TarotClient {
  readonly dispose: () => void
  readonly generate: (request: TarotGenerateRequest) => void
}

/** Owns one worker for tarot interpretation. */
export const createTarotClient = (options: CreateTarotClientOptions): TarotClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-tarot',
    type: 'module',
  })
  let activeRequestId = ''
  const transport = createWorkerTransport<TarotWorkerRequest, TarotWorkerResponse>({
    onFailure: createWorkerFailureHandler({
      fallbackDetail: '타로 해석 모델 Worker 실행 오류',
      feature: 'tarot-model',
      onResponse: (failure) => options.onResponse({...failure, requestId: activeRequestId}),
    }),
    onResponse: options.onResponse,
    worker,
  })

  return {
    dispose: transport.dispose,
    generate: (request) => {
      activeRequestId = request.requestId
      transport.send(request)
    },
  }
}
