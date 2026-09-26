/// <reference lib="webworker" />

import {getErrorMessage} from 'src/utils/get-error-message'

import {createTextGenerationExecutor} from '../text-generation/execution'
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

const workerScope = globalThis.self as DedicatedWorkerGlobalScope
const sendResponse = (response: TextModelDownloadWorkerResponse) =>
  workerScope.postMessage(response)
const textExecutors = new Map<
  PrepareTextModelRequest['modelId'],
  ReturnType<typeof createTextGenerationExecutor>
>()

const getTextExecutor = (modelId: PrepareTextModelRequest['modelId']) => {
  const current = textExecutors.get(modelId)
  if (current !== undefined) {
    return current
  }

  const executor = createTextGenerationExecutor({
    onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
  })
  textExecutors.set(modelId, executor)
  return executor
}

const prepareModel = async (request: PrepareTextModelRequest) => {
  const textExecutor = getTextExecutor(request.modelId)
  const result = await textExecutor.prepare({kind: 'device', modelId: request.modelId})
  if (!result.ok) {
    throw new Error(result.error.detail ?? '모델 파일을 내려받지 못했어요.')
  }

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
