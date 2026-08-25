/// <reference lib="webworker" />

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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return '모델 파일을 내려받지 못했어요.'
}

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
    sendResponse({message: getErrorMessage(error), restartRequired: false, type: 'error'})
  })
})
