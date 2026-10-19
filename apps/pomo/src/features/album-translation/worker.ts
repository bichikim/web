/// <reference lib="webworker" />
import {listenTextGenerationRequests} from '../text-generation/listen-text-generation-requests'
import {unwrapGenerationResult} from '../text-generation/unwrap-generation-result'

import {trimRepetitiveTail} from '../text-generation/answer'
import {createDeviceTarget} from '../text-generation/create-device-target'
import {createRequestSequence} from '../text-generation/create-request-sequence'

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
  unwrapGenerationResult(preparation, 'Gemma 4 번역을 실행하지 못했습니다.')

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
  const resultValue = unwrapGenerationResult(result, 'Gemma 4 번역을 실행하지 못했습니다.')

  const output = resultValue
  sendResponse({translations: parseAlbumTranslation(trimRepetitiveTail(output)), type: 'complete'})
}

const handleRequest = (request: AlbumTranslationWorkerRequest): Promise<void> => {
  return translation.run(() => translateAlbum(request))
}

listenTextGenerationRequests<AlbumTranslationWorkerRequest>({
  fallback: 'Gemma 4 번역을 실행하지 못했습니다.',
  handle: handleRequest,
  onError: sendResponse,
  scope: workerScope,
})
