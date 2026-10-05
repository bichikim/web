/** @vitest-environment node */
import {beforeEach, vi} from 'vitest'

import type {GenerateTextOptions, TextGenerationRuntime} from '../../../text-generation'
import type {ChatContext, ChatWorkerRequest, ChatWorkerResponse} from '../../messages'

// Worker protocol assertions do not depend on model-storage discovery.
vi.mock('../../../text-generation/download', () => ({isTextModelDownloaded: vi.fn()}))

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
}))
const runtimeMocks = vi.hoisted(() => ({
  countTokens: vi.fn(),
  create: vi.fn(),
  generate: vi.fn(),
  getTokenizer: vi.fn(),
  prepare: vi.fn(),
}))

vi.mock('../../../korean-text-postprocessor', () => ({
  containsForeignCjk: koreanMocks.containsForeignCjk,
  createForeignCjkTokenIds: koreanMocks.createForeignCjkTokenIds,
  createKoreanRefinementMessages: koreanMocks.createKoreanRefinementMessages,
  createKoreanTextSegments: koreanMocks.createKoreanTextSegments,
  replaceUnrefinedSentences: koreanMocks.replaceUnrefinedSentences,
}))
vi.mock('../../../text-generation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../text-generation')>()),
  trimRepetitiveTail: textMocks.trimRepetitiveTail,
}))
vi.mock('../../../text-generation/transformers-runtime', () => ({
  createTransformersRuntime: runtimeMocks.create,
}))
vi.mock('../../context', () => ({partitionChatHistory: contextMocks.partitionChatHistory}))
vi.mock('../../prompt', () => ({
  createChatMessages: promptMocks.createChatMessages,
  createSummaryMessages: promptMocks.createSummaryMessages,
}))

type WorkerMessageListener = (event: MessageEvent<ChatWorkerRequest>) => void

interface ResponseWaiter<TType extends string> {
  reject(error: Error): void
  resolve(): void
  readonly type: TType
}

export const context: ChatContext = {
  messages: [{content: '응원해 줘', id: 'user-1', role: 'user'}],
  summary: '',
}

export const generateRequest = (
  overrides: Partial<Extract<ChatWorkerRequest, {type: 'generate'}>> = {},
): Extract<ChatWorkerRequest, {type: 'generate'}> => ({
  context,
  modelId: 'qwen-4b',
  refineAnswer: false,
  replyId: 'reply-1',
  type: 'generate',
  ...overrides,
})

export const loadWorker = async () => {
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
  await import('../../worker')

  const dispatch = (request: unknown) => {
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
    dispatchAndWaitForResponse: async (request: unknown, type: ChatWorkerResponse['type']) => {
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

export const waitForResponse = async (
  worker: Awaited<ReturnType<typeof loadWorker>>,
  type: ChatWorkerResponse['type'],
) => {
  await worker.waitForResponse(type)
}

const DEFAULT_CONTEXT_TOKENS = 10
const FIRST_SUPPRESSED_TOKEN_ID = 17
const SECOND_SUPPRESSED_TOKEN_ID = 23
const SUPPRESSED_TOKEN_IDS = [FIRST_SUPPRESSED_TOKEN_ID, SECOND_SUPPRESSED_TOKEN_ID]

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
  runtimeMocks.countTokens.mockResolvedValue(DEFAULT_CONTEXT_TOKENS)
  runtimeMocks.getTokenizer.mockReturnValue({tokenizer: true})
  runtimeMocks.generate.mockImplementation(async (options: GenerateTextOptions) => {
    options.onToken?.('기본 답변')
    return ' 기본 답변 '
  })
  textMocks.trimRepetitiveTail.mockImplementation((text: string) => text)
  promptMocks.createChatMessages.mockReturnValue([{content: 'chat', role: 'user'}])
  promptMocks.createSummaryMessages.mockReturnValue([{content: 'summary', role: 'user'}])
  contextMocks.partitionChatHistory.mockImplementation((messages: ChatContext['messages']) => ({
    messagesToSummarize: [],
    recentMessages: messages,
  }))
  koreanMocks.createKoreanTextSegments.mockImplementation((text: string) => [{kind: 'text', text}])
  koreanMocks.createForeignCjkTokenIds.mockReturnValue(SUPPRESSED_TOKEN_IDS)
  koreanMocks.createKoreanRefinementMessages.mockReturnValue([{content: 'refine', role: 'user'}])
  koreanMocks.containsForeignCjk.mockReturnValue(false)
  koreanMocks.replaceUnrefinedSentences.mockReturnValue('대체 문장')
})

export {koreanMocks, textMocks, contextMocks, promptMocks, runtimeMocks}
