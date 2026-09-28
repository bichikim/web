/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {GenerateTextOptions, TextGenerationRuntime} from '../../text-generation'
import type {ChatContext, ChatWorkerRequest, ChatWorkerResponse} from '../messages'

const koreanMocks = vi.hoisted(() => ({
  containsForeignCjk: vi.fn(),
  createForeignCjkTokenIds: vi.fn(),
  createKoreanRefinementMessages: vi.fn(),
  createKoreanTextSegments: vi.fn(),
  replaceUnrefinedSentences: vi.fn(),
}))
const textMocks = vi.hoisted(() => ({trimRepetitiveTail: vi.fn()}))
const contextMocks = vi.hoisted(() => ({partitionChatHistory: vi.fn()}))
const promptMocks = vi.hoisted(() => ({
  createChatMessages: vi.fn(),
  createSummaryMessages: vi.fn(),
  limitChatAnswer: vi.fn(),
  takeChatAnswerPrefix: vi.fn(),
}))
const runtimeMocks = vi.hoisted(() => ({
  countTokens: vi.fn(),
  create: vi.fn(),
  generate: vi.fn(),
  getTokenizer: vi.fn(),
  prepare: vi.fn(),
}))

vi.mock('../../korean-text-postprocessor', () => ({
  containsForeignCjk: koreanMocks.containsForeignCjk,
  createForeignCjkTokenIds: koreanMocks.createForeignCjkTokenIds,
  createKoreanRefinementMessages: koreanMocks.createKoreanRefinementMessages,
  createKoreanTextSegments: koreanMocks.createKoreanTextSegments,
  replaceUnrefinedSentences: koreanMocks.replaceUnrefinedSentences,
}))
vi.mock('../../text-generation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../text-generation')>()),
  trimRepetitiveTail: textMocks.trimRepetitiveTail,
}))
vi.mock('../../text-generation/transformers-runtime', () => ({
  createTransformersRuntime: runtimeMocks.create,
}))
vi.mock('../context', () => ({partitionChatHistory: contextMocks.partitionChatHistory}))
vi.mock('../prompt', () => ({
  createChatMessages: promptMocks.createChatMessages,
  createSummaryMessages: promptMocks.createSummaryMessages,
  limitChatAnswer: promptMocks.limitChatAnswer,
  MAXIMUM_CHAT_ANSWER_CHARACTERS: 240,
  takeChatAnswerPrefix: promptMocks.takeChatAnswerPrefix,
}))

type WorkerMessageListener = (event: MessageEvent<ChatWorkerRequest>) => void

interface ResponseWaiter<TType extends string> {
  reject(error: Error): void
  resolve(): void
  readonly type: TType
}
const WORKER_IMPORT_TEST_TIMEOUT_MILLISECONDS = 30_000

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const responseWaiters = new Set<ResponseWaiter<ChatWorkerResponse['type']>>()
  const postMessage = vi.fn((response: ChatWorkerResponse) => {
    for (const waiter of responseWaiters) {
      if (response.type === waiter.type) {
        responseWaiters.delete(waiter)
        waiter.resolve()
        break
      } else if (response.type === 'error') {
        responseWaiters.delete(waiter)
        waiter.reject(new Error(response.message))
        break
      }
    }
  })

  vi.stubGlobal('self', {
    addEventListener: (type: string, listener: WorkerMessageListener) => {
      if (type === 'message') {
        messageListener = listener
      }
    },
    postMessage,
  })
  await import('../worker')

  const dispatch = (request: ChatWorkerRequest) => {
    if (messageListener === null) {
      throw new Error('채팅 Worker 메시지 리스너가 등록되지 않았습니다.')
    }

    messageListener({data: request} as MessageEvent<ChatWorkerRequest>)
  }
  const waitForNextResponse = (type: ChatWorkerResponse['type']) =>
    new Promise<void>((resolve, reject) => {
      responseWaiters.add({reject, resolve, type})
    })

  return {
    dispatch,
    dispatchAndWaitForResponse: async (
      request: ChatWorkerRequest,
      type: ChatWorkerResponse['type'],
    ) => {
      const response = waitForNextResponse(type)
      dispatch(request)
      await response
      await Promise.resolve()
    },
    postMessage,
    waitForNextResponse,
    waitForResponse: (type: ChatWorkerResponse['type']) => {
      if (postMessage.mock.calls.some(([response]) => response.type === type)) {
        return Promise.resolve().then(() => undefined)
      }

      return waitForNextResponse(type).then(() => Promise.resolve())
    },
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()

  const runtime = {
    countTokens: runtimeMocks.countTokens,
    generate: runtimeMocks.generate,
    getTokenizer: runtimeMocks.getTokenizer,
    prepare: runtimeMocks.prepare,
  } satisfies TextGenerationRuntime

  runtimeMocks.create.mockResolvedValue(runtime)
  runtimeMocks.prepare.mockResolvedValue(undefined)
  runtimeMocks.countTokens.mockResolvedValue(10)
  runtimeMocks.getTokenizer.mockReturnValue({tokenizer: true})
  runtimeMocks.generate.mockImplementation(async (options: GenerateTextOptions) => {
    options.onToken?.('기본 답변')
    return ' 기본 답변 '
  })
  textMocks.trimRepetitiveTail.mockImplementation((text: string) => text)
  promptMocks.createChatMessages.mockReturnValue([{content: 'chat', role: 'user'}])
  promptMocks.createSummaryMessages.mockReturnValue([{content: 'summary', role: 'user'}])
  promptMocks.limitChatAnswer.mockImplementation((text: string) => text)
  promptMocks.takeChatAnswerPrefix.mockImplementation((text: string, maximum: number) =>
    Array.from(text).slice(0, Math.max(0, maximum)).join(''),
  )
  contextMocks.partitionChatHistory.mockImplementation((messages: ChatContext['messages']) => ({
    messagesToSummarize: [],
    recentMessages: messages,
  }))
  koreanMocks.createKoreanTextSegments.mockImplementation((text: string) => [{kind: 'text', text}])
  koreanMocks.createForeignCjkTokenIds.mockReturnValue([17, 23])
  koreanMocks.createKoreanRefinementMessages.mockReturnValue([{content: 'refine', role: 'user'}])
  koreanMocks.containsForeignCjk.mockReturnValue(false)
  koreanMocks.replaceUnrefinedSentences.mockReturnValue('대체 문장')
})

describe('chat worker preparation', () => {
  it(
    'should cache the runtime and forward loading progress while preparing models',
    async () => {
      const worker = await loadWorker()

      await worker.dispatchAndWaitForResponse({modelId: 'qwen-4b', type: 'prepare'}, 'ready')
      const createOptions = runtimeMocks.create.mock.calls[0]?.[0]
      createOptions?.onProgress({file: 'model', progress: 0.5, status: 'progress'})
      await worker.dispatchAndWaitForResponse({modelId: 'gemma-4-e2b', type: 'prepare'}, 'ready')

      expect(runtimeMocks.create).toHaveBeenCalledOnce()
      expect(runtimeMocks.prepare).toHaveBeenNthCalledWith(1, 'qwen-4b')
      expect(runtimeMocks.prepare).toHaveBeenNthCalledWith(2, 'gemma-4-e2b')
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          file: 'model',
          progress: 0.5,
          status: 'progress',
          type: 'loading',
        }),
      )
    },
    WORKER_IMPORT_TEST_TIMEOUT_MILLISECONDS,
  )
})
