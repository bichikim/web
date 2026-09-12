import {reportClientError} from '../client-error-reporter/reporter'
import {createWorkerTransport} from 'src/utils/worker-transport'
import type {
  AlbumTranslationWorkerRequest,
  AlbumTranslationWorkerResponse,
  TranslateAlbumRequest,
} from './messages'

export interface CreateAlbumTranslationClientOptions {
  readonly onResponse: (response: AlbumTranslationWorkerResponse) => void
}

export interface AlbumTranslationClient {
  readonly dispose: () => void
  readonly translate: (input: Omit<TranslateAlbumRequest, 'type'>) => void
}

export const createAlbumTranslationClient = (
  options: CreateAlbumTranslationClientOptions,
): AlbumTranslationClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-album-translation',
    type: 'module',
  })
  const transport = createWorkerTransport<
    AlbumTranslationWorkerRequest,
    AlbumTranslationWorkerResponse
  >({
    onFailure: (failure) => {
      reportClientError(failure.cause, {feature: 'album-translation', source: 'worker'})
      options.onResponse({
        message:
          failure.code === 'message-error'
            ? 'Worker 응답을 읽지 못했습니다.'
            : failure.detail || 'Gemma 4 번역 Worker 실행 오류',
        restartRequired: true,
        type: 'error',
      })
    },
    onResponse: options.onResponse,
    worker,
  })

  return {
    dispose: transport.dispose,
    translate: (input) => transport.send({...input, type: 'translate'}),
  }
}
