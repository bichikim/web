import {createWorkerTransport} from '../text-generation/worker-transport'
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
    createErrorResponse: (event) => ({
      message: event.message || 'Gemma 4 번역 Worker 실행 오류',
      restartRequired: true,
      type: 'error',
    }),
    feature: 'album-translation',
    onResponse: options.onResponse,
    worker,
  })

  return {
    dispose: transport.dispose,
    translate: (input) => transport.send({...input, type: 'translate'}),
  }
}
