/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {TextGenerationProgress} from '../progress'
import {
  createTextGenerationExecutor,
  type TextGenerationExecutionProvider,
  type TextGenerationRequest,
  type TextTokenVocabulary,
} from '../index'
import type {GenerateTextOptions, TextGenerationRuntime} from '../runtime'

const runtimeMocks = vi.hoisted(() => ({
  countTokens: vi.fn(),
  create: vi.fn(),
  generate: vi.fn(),
  getTokenizer: vi.fn(),
  prepare: vi.fn(),
}))

vi.mock('../transformers-runtime', () => ({
  createTransformersRuntime: runtimeMocks.create,
}))

const tokenizer: TextTokenVocabulary = {
  all_special_ids: [0],
  decode: () => '텍스트',
  get_vocab: () => new Map([['텍스트', 1]]),
}

const deviceTarget = {kind: 'device', modelId: 'gemma-4-e2b'} as const
const serverTarget = {
  kind: 'server',
  modelId: 'gpt-5.6-luna',
  provider: 'openai',
} as const
const messages = [{content: '안녕', role: 'user'}] as const

const createRequest = (execution: TextGenerationRequest['execution'] = deviceTarget) =>
  ({
    execution,
    messages,
    parameters: {
      maximumTokens: 12,
      noRepeatNgramSize: 4,
      repetitionPenalty: 1.1,
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
    },
    requestId: 'request-1',
  }) satisfies TextGenerationRequest

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  const runtime = {
    countTokens: runtimeMocks.countTokens,
    generate: runtimeMocks.generate,
    getTokenizer: runtimeMocks.getTokenizer,
    prepare: runtimeMocks.prepare,
  } satisfies TextGenerationRuntime

  runtimeMocks.create.mockResolvedValue(runtime)
  runtimeMocks.countTokens.mockResolvedValue(42)
  runtimeMocks.generate.mockImplementation(async (options: GenerateTextOptions) => {
    options.onToken?.('첫 토큰')
    return '완성된 텍스트'
  })
  runtimeMocks.getTokenizer.mockReturnValue(tokenizer)
  runtimeMocks.prepare.mockResolvedValue(undefined)
})

describe('text generation executor', () => {
  it('should route device requests through the local runtime contract', async () => {
    const progress: TextGenerationProgress = {
      files: [],
      loadedBytes: 0,
      percentage: 0,
      totalBytes: 0,
    }
    const onProgress = vi.fn<(value: TextGenerationProgress) => void>()
    const executor = createTextGenerationExecutor({onProgress})

    expect(runtimeMocks.create).not.toHaveBeenCalled()
    expect(await executor.prepare(deviceTarget)).toEqual({ok: true, value: undefined})
    const count = await executor.countTokens(deviceTarget, messages)
    const tokenizerResult = executor.getTokenizer(deviceTarget)
    const observer = vi.fn()
    const result = await executor.generate(createRequest(), {onResponse: observer})

    expect(count).toEqual({ok: true, value: 42})
    expect(tokenizerResult).toEqual({ok: true, value: tokenizer})
    expect(result).toEqual({ok: true, value: '완성된 텍스트'})
    expect(runtimeMocks.create).toHaveBeenCalledOnce()
    expect(runtimeMocks.prepare).toHaveBeenCalledWith('gemma-4-e2b')
    expect(runtimeMocks.countTokens).toHaveBeenCalledWith([...messages])
    expect(runtimeMocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        maximumTokens: 12,
        messages: [...messages],
        noRepeatNgramSize: 4,
        repetitionPenalty: 1.1,
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
      }),
    )
    expect(observer.mock.calls.map(([response]) => response.type)).toEqual([
      'started',
      'token',
      'complete',
    ])
    expect(onProgress).not.toHaveBeenCalledWith(progress)
  })

  it('should normalize local runtime failures and preserve the request id', async () => {
    runtimeMocks.generate.mockRejectedValue(new Error('생성 실패'))
    const executor = createTextGenerationExecutor()
    const observer = vi.fn()

    await executor.prepare(deviceTarget)
    const result = await executor.generate(createRequest(), {onResponse: observer})

    expect(result).toEqual({
      error: {
        code: 'execution-failed',
        detail: '생성 실패',
        phase: 'generate',
        retryable: true,
      },
      ok: false,
    })
    expect(observer).toHaveBeenLastCalledWith({
      error: {
        code: 'execution-failed',
        detail: '생성 실패',
        phase: 'generate',
        retryable: true,
      },
      requestId: 'request-1',
      type: 'error',
    })
  })

  it('should expose cancellation while ignoring late local runtime responses', async () => {
    let emitToken: ((text: string) => void) | undefined
    let generationSignal: AbortSignal | undefined
    let resolveGeneration: ((text: string) => void) | undefined
    runtimeMocks.generate.mockImplementation((options: GenerateTextOptions) => {
      generationSignal = options.signal
      emitToken = options.onToken
      return new Promise<string>((resolve) => {
        resolveGeneration = resolve
      })
    })
    const executor = createTextGenerationExecutor()
    const observer = vi.fn()

    await executor.prepare(deviceTarget)
    const resultPromise = executor.generate(createRequest(), {onResponse: observer})
    await vi.waitFor(() => expect(runtimeMocks.generate).toHaveBeenCalledOnce())
    executor.cancel('request-1')

    expect(generationSignal?.aborted).toBe(true)
    expect(await resultPromise).toEqual({
      error: {code: 'cancelled', phase: 'generate', retryable: false},
      ok: false,
    })
    emitToken?.('늦은 토큰')
    resolveGeneration?.('늦은 완료')
    await Promise.resolve()

    expect(observer.mock.calls.map(([response]) => response.type)).toEqual(['started', 'cancelled'])
  })

  it('should not start a local generation that is cancelled immediately', async () => {
    const executor = createTextGenerationExecutor()
    const observer = vi.fn()

    await executor.prepare(deviceTarget)
    const resultPromise = executor.generate(createRequest(), {onResponse: observer})
    executor.cancel('request-1')

    expect(await resultPromise).toEqual({
      error: {code: 'cancelled', phase: 'generate', retryable: false},
      ok: false,
    })
    expect(runtimeMocks.generate).not.toHaveBeenCalled()
    expect(observer.mock.calls.map(([response]) => response.type)).toEqual(['started', 'cancelled'])
  })

  it('should keep the server target unavailable until a server provider is supplied', async () => {
    const executor = createTextGenerationExecutor()
    const observer = vi.fn()

    const preparation = await executor.prepare(serverTarget)
    const result = await executor.generate(createRequest(serverTarget), {onResponse: observer})

    expect(preparation).toEqual({
      error: {
        code: 'server-unavailable',
        detail: '서버 텍스트 실행기가 아직 연결되지 않았어요.',
        phase: 'prepare',
        retryable: false,
      },
      ok: false,
    })
    expect(result).toEqual({
      error: {
        code: 'server-unavailable',
        detail: '서버 텍스트 실행기가 아직 연결되지 않았어요.',
        phase: 'generate',
        retryable: false,
      },
      ok: false,
    })
    expect(observer).toHaveBeenLastCalledWith({
      error: {
        code: 'server-unavailable',
        detail: '서버 텍스트 실행기가 아직 연결되지 않았어요.',
        phase: 'generate',
        retryable: false,
      },
      requestId: 'request-1',
      type: 'error',
    })
    expect(runtimeMocks.create).not.toHaveBeenCalled()
  })

  it('should connect a future server provider through the same request contract', async () => {
    const provider: TextGenerationExecutionProvider = {
      cancel: vi.fn(),
      countTokens: vi.fn().mockResolvedValue(7),
      dispose: vi.fn(),
      generate: vi.fn(async (_request, onToken) => {
        onToken('서버 토큰')
        return '서버 응답'
      }),
      getTokenizer: vi.fn().mockReturnValue(tokenizer),
      prepare: vi.fn().mockResolvedValue(undefined),
    }
    const createServerProvider = vi.fn(() => provider)
    const executor = createTextGenerationExecutor({createServerProvider})
    const observer = vi.fn()

    expect(await executor.prepare(serverTarget)).toEqual({ok: true, value: undefined})
    const result = await executor.generate(createRequest(serverTarget), {onResponse: observer})

    expect(createServerProvider).toHaveBeenCalledWith({
      onProgress: expect.any(Function),
      target: serverTarget,
    })
    expect(provider.prepare).toHaveBeenCalledWith(serverTarget)
    expect(provider.generate).toHaveBeenCalledWith(
      createRequest(serverTarget),
      expect.any(Function),
    )
    expect(result).toEqual({ok: true, value: '서버 응답'})
    expect(observer.mock.calls.map(([response]) => response.type)).toEqual([
      'started',
      'token',
      'complete',
    ])
    expect(runtimeMocks.create).not.toHaveBeenCalled()
  })
})
