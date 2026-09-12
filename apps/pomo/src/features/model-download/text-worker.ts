/// <reference lib="webworker" />

import {getErrorMessage} from 'src/utils/get-error-message'

import type {
  PrepareTextModelRequest,
  TextGenerationErrorResponse,
  TextGenerationLoadingResponse,
  TextGenerationReadyResponse,
} from '../text-generation/messages'

type TextModelDownloadWorkerResponse =
  | TextGenerationErrorResponse
  | TextGenerationLoadingResponse
  | TextGenerationReadyResponse

const workerScope = self as DedicatedWorkerGlobalScope
const sendResponse = (response: TextModelDownloadWorkerResponse) =>
  workerScope.postMessage(response)

const prepareModel = async (request: PrepareTextModelRequest) => {
  const {createTransformersRuntime} = await import('../text-generation/transformers-runtime')
  const runtime = createTransformersRuntime({
    onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
  })
  await runtime.prepare(request.modelId)
  sendResponse({type: 'ready'})
}

workerScope.addEventListener('message', (event: MessageEvent<PrepareTextModelRequest>) => {
  prepareModel(event.data).catch((error: unknown) => {
    sendResponse({
      message: getErrorMessage(error, '모델 파일을 내려받지 못했어요.'),
      restartRequired: false,
      type: 'error',
    })
  })
})
