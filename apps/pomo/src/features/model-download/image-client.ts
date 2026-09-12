import type {GenerationResponse, PrepareImageRequest} from '../image-generation/messages'
import type {ImageVariant} from '../image-generation/settings'
import {reportClientError} from '../client-error-reporter/reporter'
import {createWorkerTransport} from 'src/utils/worker-transport'
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
    onFailure: (failure) => {
      reportClientError(failure.cause, {feature: 'image-model-download', source: 'worker'})
      options.callbacks.onError(
        failure.code === 'message-error'
          ? 'Worker 응답을 읽지 못했습니다.'
          : failure.detail || '이미지 모델을 내려받지 못했어요.',
      )
    },
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
