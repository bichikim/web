import type {
  PrepareTextModelRequest,
  TextGenerationErrorResponse,
  TextGenerationLoadingResponse,
  TextGenerationReadyResponse,
} from '../text-generation/messages'
import {reportClientError} from '../client-error-reporter/reporter'
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
    onFailure: (failure) => {
      reportClientError(failure.cause, {feature: 'text-model-download', source: 'worker'})
      options.onResponse({
        message:
          failure.code === 'message-error'
            ? 'Worker 응답을 읽지 못했습니다.'
            : failure.detail || '모델 다운로드 Worker 실행 오류',
        restartRequired: true,
        type: 'error',
      })
    },
    onResponse: options.onResponse,
    worker,
  })

  return {dispose: transport.dispose, prepare: transport.send}
}
