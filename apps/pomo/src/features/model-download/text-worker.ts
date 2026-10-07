/// <reference lib="webworker" />

import {getErrorMessage} from 'src/utils/get-error-message'
import {httpFetch} from '../http-client'
import {
  createModelStorage,
  createResumableModelFetch,
  reportModelStorageError,
} from '../model-storage'
import {createPomoAssetFetcher, isPomoAssetBundled, isPomoSteamRuntime} from '../product-assets'

import {downloadTextModel} from '../text-generation/download-text-model'
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
const prepareModel = async (request: PrepareTextModelRequest) => {
  await downloadTextModel({
    modelId: request.modelId,
    onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
    runtime: {
      isAssetBundled: isPomoAssetBundled,
      onStorageError: reportModelStorageError,
      resumable: createResumableModelFetch({
        fetcher: createPomoAssetFetcher(isPomoSteamRuntime() ? globalThis.fetch : httpFetch),
      }),
      storage: createModelStorage(),
    },
  })
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
