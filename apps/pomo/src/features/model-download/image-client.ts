import type {GenerationResponse, PrepareImageRequest} from '../image-generation/messages'
import type {ImageVariant} from '../image-generation/settings'
import {createWorkerTransport} from '../text-generation/worker-transport'
import type {ModelDownloadCallbacks, ModelDownloadClient} from './controller'

export interface CreateImageModelDownloadOptions {
  readonly callbacks: ModelDownloadCallbacks
  readonly modelId: ImageVariant
}

export const createImageModelDownloadClient = (
  options: CreateImageModelDownloadOptions,
): ModelDownloadClient => {
  const worker = new Worker(new URL('../image-generation/worker.ts', import.meta.url), {
    name: 'pomo-image-model-download',
    type: 'module',
  })
  const transport = createWorkerTransport<PrepareImageRequest, GenerationResponse>({
    createErrorResponse: (event) => ({
      message: event.message || '이미지 모델을 내려받지 못했어요.',
      type: 'error',
    }),
    feature: 'image-model-download',
    onResponse: (response) => {
      switch (response.type) {
        case 'progress':
          options.callbacks.onProgress(response.percentage ?? 0)
          return
        case 'ready':
          options.callbacks.onReady()
          return
        case 'error':
          options.callbacks.onError(response.message)
          return
        case 'image':
        case 'prompt':
          return
      }
      response satisfies never
    },
    worker,
  })
  return {
    dispose: transport.dispose,
    prepare: () => transport.send({type: 'prepare-image', variant: options.modelId}),
  }
}
