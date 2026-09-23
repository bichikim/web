import type {
  PrepareTextModelRequest,
  TextGenerationErrorResponse,
  TextGenerationLoadingResponse,
  TextGenerationReadyResponse,
} from '../text-generation/messages'
import {createWorkerFailureHandler} from '../worker-failure'
import {createWorkerTransport} from 'src/utils/worker-transport'

export type TextModelDownloadResponse =
  | TextGenerationErrorResponse
  | TextGenerationLoadingResponse
  | TextGenerationReadyResponse

export interface CreateTextModelDownloadClientOptions {
  readonly onResponse: (response: TextModelDownloadResponse) => void
}

export interface TextModelDownloadClient {
  readonly dispose: () => void
  readonly prepare: (request: PrepareTextModelRequest) => void
}

/** Owns the Worker that downloads and prepares one text model. */
export const createTextModelDownloadClient = (
  options: CreateTextModelDownloadClientOptions,
): TextModelDownloadClient => {
  const worker = new Worker(new URL('./text-worker.ts', import.meta.url), {
    name: 'pomo-text-model-download',
    type: 'module',
  })
  const transport = createWorkerTransport<PrepareTextModelRequest, TextModelDownloadResponse>({
    onFailure: createWorkerFailureHandler({
      fallbackDetail: '모델 다운로드 Worker 실행 오류',
      feature: 'text-model-download',
      onResponse: options.onResponse,
    }),
    onResponse: options.onResponse,
    worker,
  })

  return {dispose: transport.dispose, prepare: transport.send}
}
