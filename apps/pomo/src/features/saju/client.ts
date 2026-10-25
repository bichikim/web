import {createWorkerTransport} from 'src/utils/worker-transport'
import type {DefaultTextModelId} from '../text-generation/settings'
import {createCloudSajuClient} from './create-cloud-saju-client'
import type {SajuGenerateRequest, SajuGenerationResponse} from './generation-messages'

export interface SajuClient {
  readonly dispose: () => void
  readonly generate: (request: SajuGenerateRequest) => void
}

/** Creates a reading client for the selected model, defaulting to a local Worker. */
export function createSajuClient(
  onResponse: (response: SajuGenerationResponse) => void,
  modelId?: DefaultTextModelId,
): SajuClient {
  if (modelId === 'cloud') {
    return createCloudSajuClient(onResponse)
  }
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
