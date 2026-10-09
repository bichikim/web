import {createWorkerTransport} from 'src/utils/worker-transport'
import type {SajuGenerateRequest, SajuGenerationResponse} from './generation-messages'

export interface SajuClient {
  readonly dispose: () => void
  readonly generate: (request: SajuGenerateRequest) => void
}

/** Owns one Worker and the request sent to it. */
export function createSajuClient(
  onResponse: (response: SajuGenerationResponse) => void,
): SajuClient {
  let activeId = ''
  const transport = createWorkerTransport<SajuGenerateRequest, SajuGenerationResponse>({
    onFailure: (failure) =>
      onResponse({
        message: failure.detail || '사주 풀이를 시작하지 못했어요.',
        requestId: activeId,
        type: 'error',
      }),
    onResponse,
    worker: new Worker(new URL('./worker.ts', import.meta.url), {
      name: 'pomo-saju',
      type: 'module',
    }),
  })
  return {
    dispose: transport.dispose,
    generate: (request) => {
      activeId = request.requestId
      transport.send(request)
    },
  }
}
