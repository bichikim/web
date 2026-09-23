/// <reference lib="webworker" />

import {
  createDeviceTarget,
  createGenerationFailure,
  createRequestSequence,
  trimRepetitiveTail,
} from '../text-generation'

import {getErrorMessage} from 'src/utils/get-error-message'
import {createExclusiveAsyncTask} from 'src/utils/create-exclusive-async-task'

import {createTextGenerationExecutor} from '../text-generation/execution'
import type {AlbumTranslationWorkerRequest, AlbumTranslationWorkerResponse} from './messages'
import {parseAlbumTranslation} from './output'
import {createAlbumTranslationMessages} from './prompt'

const MAXIMUM_NEW_TOKENS = 900
const workerScope = globalThis.self as DedicatedWorkerGlobalScope

const sendResponse = (response: AlbumTranslationWorkerResponse) => workerScope.postMessage(response)
const textExecutor = createTextGenerationExecutor({
  onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
})
const translation = createExclusiveAsyncTask()
const createRequestId = createRequestSequence('album-translation')

const translateAlbum = async (request: AlbumTranslationWorkerRequest) => {
  const preparation = await textExecutor.prepare(createDeviceTarget('gemma-4-e2b'))
  if (!preparation.ok) {
    throw createGenerationFailure(preparation.error, 'Gemma 4 번역을 실행하지 못했습니다.')
  }

  sendResponse({type: 'started'})
  const result = await textExecutor.generate(
    {
      execution: createDeviceTarget('gemma-4-e2b'),
      messages: createAlbumTranslationMessages(request),
      parameters: {
        maximumTokens: MAXIMUM_NEW_TOKENS,
        noRepeatNgramSize: 3,
        repetitionPenalty: 1.05,
        temperature: 0.1,
        topK: 20,
        topP: 0.9,
      },
      requestId: createRequestId(),
    },
    {onResponse: () => undefined},
  )
  if (!result.ok) {
    throw createGenerationFailure(result.error, 'Gemma 4 번역을 실행하지 못했습니다.')
  }

  const output = result.value
  sendResponse({translations: parseAlbumTranslation(trimRepetitiveTail(output)), type: 'complete'})
}

const handleRequest = (request: AlbumTranslationWorkerRequest): Promise<void> => {
  return translation.run(() => translateAlbum(request))
}

workerScope.addEventListener('message', (event: MessageEvent<AlbumTranslationWorkerRequest>) => {
  handleRequest(event.data).catch((error: unknown) => {
    sendResponse({
      message: getErrorMessage(error, 'Gemma 4 번역을 실행하지 못했습니다.'),
      restartRequired: false,
      type: 'error',
    })
  })
})
