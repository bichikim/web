/** @vitest-environment node */
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'

import type {AlbumTranslationWorkerRequest, AlbumTranslationWorkerResponse} from '../messages'
import {
  createTextGenerationExecutor,
  type CreateTextGenerationExecutorOptions,
  type TextGenerationError,
  type TextGenerationExecutor,
} from '../../text-generation/execution'
import {failureResult, successResult} from 'src/features/result'
import type {TextGenerationProgress} from '../../text-generation/progress'

type WorkerMessageListener = (event: MessageEvent<AlbumTranslationWorkerRequest>) => void

const textGenerationExecution = vi.hoisted(() => ({
  createTextGenerationExecutor:
    vi.fn<(options?: CreateTextGenerationExecutorOptions) => TextGenerationExecutor>(),
}))

vi.mock('../../text-generation/execution', () => ({
  createTextGenerationExecutor: textGenerationExecution.createTextGenerationExecutor,
}))

const textExecutor = {
  cancel: vi.fn<TextGenerationExecutor['cancel']>(),
  countTokens: vi.fn<TextGenerationExecutor['countTokens']>(),
  dispose: vi.fn<TextGenerationExecutor['dispose']>(),
  generate: vi.fn<TextGenerationExecutor['generate']>(),
  getTokenizer: vi.fn<TextGenerationExecutor['getTokenizer']>(),
  prepare: vi.fn<TextGenerationExecutor['prepare']>(),
} satisfies TextGenerationExecutor

const defaultTranslation =
  '{"en":{"title":"Night","description":"Rest"},' +
  '"ja":{"title":"夜","description":"休息"},' +
  '"zh-Hans":{"title":"夜晚","description":"休息"}}'

const firstTranslation =
  '{"en":{"title":"First","description":"A"},' +
  '"ja":{"title":"一","description":"あ"},' +
  '"zh-Hans":{"title":"一","description":"一"}}'

const createGenerationError = (detail?: string): TextGenerationError => ({
  code: 'execution-failed',
  ...(detail === undefined ? {} : {detail}),
  phase: 'generate',
  retryable: true,
})

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: AlbumTranslationWorkerResponse) => void>()

  vi.stubGlobal('self', {
    addEventListener: (type: string, listener: WorkerMessageListener) => {
      if (type === 'message') {
        messageListener = listener
      }
    },
    postMessage,
  })
  await import('../worker')

  return {
    dispatch: (request: AlbumTranslationWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('앨범 번역 Worker 메시지 리스너가 등록되지 않았습니다.')
      }

      messageListener({data: request} as MessageEvent<AlbumTranslationWorkerRequest>)
    },
    postMessage,
  }
}

type AlbumTranslationWorker = Awaited<ReturnType<typeof loadWorker>>

let worker: AlbumTranslationWorker
let forwardProgress: CreateTextGenerationExecutorOptions['onProgress'] | undefined

beforeAll(async () => {
  textGenerationExecution.createTextGenerationExecutor.mockImplementation((options) => {
    forwardProgress = options?.onProgress
    return textExecutor
  })
  worker = await loadWorker()
})

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(createTextGenerationExecutor).mockReturnValue(textExecutor)
  textExecutor.prepare.mockResolvedValue(successResult(undefined))
  textExecutor.generate.mockResolvedValue(successResult(defaultTranslation))
  worker.postMessage.mockReset()
})

describe('album translation worker', () => {
  it('should ignore a concurrent translate request while one is in flight', async () => {
    const firstGeneration = Promise.withResolvers<void>()
    const generationStarted = Promise.withResolvers<void>()
    const translationFinished = Promise.withResolvers<AlbumTranslationWorkerResponse>()
    textExecutor.generate.mockImplementationOnce(async () => {
      generationStarted.resolve()
      await firstGeneration.promise
      return successResult(firstTranslation)
    })
    worker.postMessage.mockImplementation((response) => {
      if (response.type === 'complete' || response.type === 'error') {
        translationFinished.resolve(response)
      }
    })

    worker.dispatch({description: '첫 번째', title: '첫 번째', type: 'translate'})
    expect(textExecutor.prepare).toHaveBeenCalledOnce()
    await generationStarted.promise

    worker.dispatch({description: '두 번째', title: '두 번째', type: 'translate'})
    firstGeneration.resolve()

    expect(await translationFinished.promise).toMatchObject({type: 'complete'})
    expect(
      worker.postMessage.mock.calls.filter(([response]) => response.type === 'complete'),
    ).toHaveLength(1)
    expect(textExecutor.generate).toHaveBeenCalledOnce()
    expect(textExecutor.prepare).toHaveBeenCalledWith({kind: 'device', modelId: 'gemma-4-e2b'})
    expect(textExecutor.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        execution: {kind: 'device', modelId: 'gemma-4-e2b'},
      }),
      expect.objectContaining({onResponse: expect.any(Function)}),
    )
  })

  it('should release the translation guard after a generation failure', async () => {
    const firstFailureReported = Promise.withResolvers<void>()
    const translationCompleted = Promise.withResolvers<void>()
    textExecutor.generate.mockResolvedValueOnce(
      failureResult(createGenerationError('첫 번역 실패')),
    )
    worker.postMessage.mockImplementation((response) => {
      if (response.type === 'error' && response.message === '첫 번역 실패') {
        firstFailureReported.resolve()
      }
      if (response.type === 'complete') {
        translationCompleted.resolve()
      }
    })

    worker.dispatch({description: '첫 번째', title: '첫 번째', type: 'translate'})
    await firstFailureReported.promise

    worker.dispatch({description: '두 번째', title: '두 번째', type: 'translate'})
    await translationCompleted.promise
    expect(textExecutor.generate).toHaveBeenCalledTimes(2)
  })

  it('should return structured locales from the shared text executor', async () => {
    const translationCompleted = Promise.withResolvers<void>()
    worker.postMessage.mockImplementation((response) => {
      if (response.type === 'complete') {
        translationCompleted.resolve()
      }
    })

    worker.dispatch({description: '쉬어가는 시간', title: '밤', type: 'translate'})
    await translationCompleted.promise

    expect(worker.postMessage).toHaveBeenLastCalledWith({
      translations: {
        en: {description: 'Rest', title: 'Night'},
        ja: {description: '休息', title: '夜'},
        'zh-Hans': {description: '休息', title: '夜晚'},
      },
      type: 'complete',
    })
    expect(textExecutor.prepare).toHaveBeenCalledWith({kind: 'device', modelId: 'gemma-4-e2b'})
  })

  it.each([
    {detail: 'generation failed', message: 'generation failed'},
    {detail: '', message: 'Gemma 4 번역을 실행하지 못했습니다.'},
    {message: 'Gemma 4 번역을 실행하지 못했습니다.'},
  ])(
    'should report translation failures without requiring a restart',
    async ({detail, message}) => {
      const errorReported = Promise.withResolvers<void>()
      textExecutor.generate.mockResolvedValueOnce(failureResult(createGenerationError(detail)))
      worker.postMessage.mockImplementation((response) => {
        if (response.type === 'error' && response.message === message) {
          errorReported.resolve()
        }
      })

      worker.dispatch({description: '쉬어가는 시간', title: '밤', type: 'translate'})

      await errorReported.promise
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        message,
        restartRequired: false,
        type: 'error',
      })
    },
  )

  it('should forward text generation progress to the worker client', () => {
    const progress: TextGenerationProgress = {
      files: [{fileName: 'model.onnx', loadedBytes: 25, percentage: 25, totalBytes: 100}],
      loadedBytes: 25,
      percentage: 25,
      totalBytes: 100,
    }

    expect(forwardProgress).toBeDefined()
    forwardProgress?.(progress)

    expect(worker.postMessage).toHaveBeenCalledWith({...progress, type: 'loading'})
  })
})
