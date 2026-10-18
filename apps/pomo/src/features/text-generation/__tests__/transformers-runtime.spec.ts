/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  cacheMatch: vi.fn(async () => undefined as Response | undefined),
  cacheOptions: null as null | Record<string, (...args: never[]) => unknown>,
  cachePut: vi.fn(),
  deletePartial: vi.fn(),
  env: {} as Record<string, unknown>,
  gemmaFromPretrained: vi.fn(),
  gemmaProcessorFromPretrained: vi.fn(),
  interrupt: vi.fn(),
  lfmFromPretrained: vi.fn(),
  loadGgufModel: vi.fn(),
  loadQwenModel: vi.fn(),
  onProgress: vi.fn(),
  processorFromPretrained: vi.fn(),
  reportStorageError: vi.fn(),
  resumableFetch: vi.fn(
    async () => new Response('{%- generation -%}QAD chat template{%- endgeneration -%}'),
  ),
  resumableOptions: null as null | {readonly fetcher?: typeof fetch},
  stoppingCriteria: null as null | {readonly interrupt: () => void},
  streamerOptions: null as null | {callback_function: (text: string) => void},
  tokenizerFromPretrained: vi.fn(),
}))

vi.mock('@huggingface/transformers', () => ({
  AutoProcessor: {from_pretrained: mocks.processorFromPretrained},
  AutoTokenizer: {from_pretrained: mocks.tokenizerFromPretrained},
  env: mocks.env,
  Gemma4ForCausalLM: {from_pretrained: mocks.gemmaFromPretrained},
  Gemma4Processor: {from_pretrained: mocks.gemmaProcessorFromPretrained},
  InterruptableStoppingCriteria: class InterruptableStoppingCriteriaMock {
    constructor() {
      mocks.stoppingCriteria = this
    }

    interrupt() {
      mocks.interrupt()
    }
  },
  Lfm2ForCausalLM: {from_pretrained: mocks.lfmFromPretrained},
  TextStreamer: class TextStreamerMock {
    constructor(_tokenizer: unknown, options: {callback_function: (text: string) => void}) {
      mocks.streamerOptions = options
    }
  },
}))
vi.mock('../model', () => ({
  getTextModelImplementation: (modelId: string) => ({
    architecture:
      modelId === 'lfm-2.6b-qad'
        ? 'lfm-2-gguf'
        : modelId.startsWith('lfm')
          ? 'lfm-2'
          : modelId.startsWith('qwen')
            ? 'qwen-3.5'
            : 'gemma-4',
    assetSource: {
      host: 'https://models.example/',
      pathTemplate: 'models/{model}/{revision}/',
      revision: 'revision-1',
    },
    id: modelId,
    quantization: 'q4',
    repositoryId: `repository/${modelId}`,
    tokenizerSubfolder: 'qad',
  }),
}))
vi.mock('../qwen-model', () => ({loadQwenModel: mocks.loadQwenModel}))
vi.mock('../load-gguf-model', () => ({loadGgufModel: mocks.loadGgufModel}))
vi.mock('../../model-storage', () => ({
  createModelStorage: vi.fn(() => ({storage: true})),
  createResumableModelFetch: vi.fn((options: {readonly fetcher?: typeof fetch} = {}) => {
    mocks.resumableOptions = options
    return {
      deletePartial: mocks.deletePartial,
      fetch: mocks.resumableFetch,
    }
  }),
  createTransformersModelCache: vi.fn((options: Record<string, (...args: never[]) => unknown>) => {
    mocks.cacheOptions = options
    return {cache: true, match: mocks.cacheMatch, put: mocks.cachePut}
  }),
  reportModelStorageError: mocks.reportStorageError,
}))

import {createTransformersRuntime} from '../transformers-runtime'

it('prepares GGUF weights with the QAD tokenizer instead of an ONNX session', async () => {
  mocks.loadGgufModel.mockResolvedValue({createChatCompletion: vi.fn()})
  mocks.tokenizerFromPretrained.mockResolvedValue(tokenizer)
  const runtime = createTransformersRuntime({onProgress: mocks.onProgress})

  await runtime.prepare('lfm-2.6b-qad')

  expect(mocks.loadGgufModel).toHaveBeenCalledOnce()
  expect(mocks.loadGgufModel).toHaveBeenCalledWith(
    expect.objectContaining({
      fetcher: mocks.resumableFetch,
      onStorageError: mocks.reportStorageError,
      onStored: mocks.deletePartial,
      storage: {storage: true},
    }),
  )
  expect(mocks.cachePut.mock.calls[0]?.[0]).toBe(
    'https://models.example/models/repository/lfm-2.6b-qad/revision-1/qad/chat_template.jinja',
  )
  expect(mocks.tokenizerFromPretrained).toHaveBeenCalledWith('repository/lfm-2.6b-qad', {
    revision: 'revision-1',
  })
  expect(mocks.env.remotePathTemplate).toBe('models/{model}/revision-1/qad/')
  expect(mocks.lfmFromPretrained).not.toHaveBeenCalled()
  expect(runtime.getTokenizer()).toBe(tokenizer)
  expect(tokenizer).toMatchObject({chat_template: 'QAD chat template'})
})

const messages = [{content: '안녕', role: 'user' as const}]
const tokenizer = {
  all_special_ids: [0],
  decode: vi.fn(() => 'token'),
  get_vocab: vi.fn(() => new Map()),
}

const createProcessor = () => {
  const processor = vi.fn(async () => ({input_ids: {dims: [1, 7]}})) as ReturnType<typeof vi.fn> & {
    apply_chat_template: ReturnType<typeof vi.fn>
    tokenizer: typeof tokenizer
  }
  processor.apply_chat_template = vi.fn(() => 'prompt')
  processor.tokenizer = tokenizer
  return processor
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.gemmaProcessorFromPretrained.mockImplementation(mocks.processorFromPretrained)
  mocks.env.backends = {
    onnx: {
      wasm: {
        wasmPaths: {
          mjs: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/ort-wasm-simd-threaded.asyncify.mjs',
          wasm: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/ort-wasm-simd-threaded.asyncify.wasm',
        },
      },
    },
  }
  mocks.cacheOptions = null
  mocks.resumableOptions = null
  mocks.stoppingCriteria = null
  mocks.streamerOptions = null
})

afterEach(() => {
  mocks.cacheMatch.mockResolvedValue(undefined)
  mocks.resumableFetch.mockImplementation(
    async () => new Response('{%- generation -%}QAD chat template{%- endgeneration -%}'),
  )
  mocks.cachePut.mockReset()
  vi.unstubAllEnvs()
})

it('prepares cached QAD files even when the network is unavailable', async () => {
  mocks.loadGgufModel.mockResolvedValue({createChatCompletion: vi.fn()})
  mocks.tokenizerFromPretrained.mockResolvedValue(tokenizer)
  mocks.cacheMatch.mockResolvedValue(new Response('cached QAD template'))
  mocks.resumableFetch.mockRejectedValue(new Error('offline'))
  const runtime = createTransformersRuntime({onProgress: vi.fn()})
  await expect(runtime.prepare('lfm-2.6b-qad')).resolves.toBeUndefined()
  expect(mocks.resumableFetch).not.toHaveBeenCalled()
})

it('does not allocate a GGUF engine when its tokenizer fails to load', async () => {
  const error = new Error('invalid tokenizer')
  mocks.tokenizerFromPretrained.mockRejectedValueOnce(error)
  mocks.loadGgufModel.mockResolvedValue({createChatCompletion: vi.fn()})
  const runtime = createTransformersRuntime({onProgress: vi.fn()})
  await expect(runtime.prepare('lfm-2.6b-qad')).rejects.toBe(error)
  await vi.dynamicImportSettled()
  expect(mocks.loadGgufModel).not.toHaveBeenCalled()
})

it('should prepare Gemma once, report byte progress, and configure versioned caching', async () => {
  const processor = createProcessor()
  const model = {generate: vi.fn(async () => undefined)}
  mocks.processorFromPretrained.mockResolvedValue(processor)
  mocks.gemmaFromPretrained.mockImplementation(async (_id, options) => {
    options.progress_callback({status: 'initiate'})
    options.progress_callback({files: 2, loaded: 5, status: 'progress_total', total: 10})
    return model
  })
  const runtime = createTransformersRuntime({onProgress: mocks.onProgress})

  await Promise.all([runtime.prepare('gemma-4-e2b'), runtime.prepare('gemma-4-e2b')])
  await runtime.prepare('gemma-4-e2b')

  expect(mocks.gemmaFromPretrained).toHaveBeenCalledOnce()
  expect(mocks.onProgress).toHaveBeenCalledOnce()
  expect(runtime.getTokenizer()).toBe(tokenizer)
  const getStorageKey = mocks.cacheOptions?.getStorageKey as (request: string) => string
  const tokenizerUrl =
    'https://models.example/models/repository/gemma-4-e2b/revision-1/tokenizer.json'
  expect(getStorageKey(tokenizerUrl)).toBe(`${tokenizerUrl}?pomo-cache-version=1`)
  expect(getStorageKey('other')).toBe('other')
  expect(mocks.cacheOptions?.onError).toBe(mocks.reportStorageError)
  expect(mocks.cacheOptions?.onStored).toBe(mocks.deletePartial)
  expect(mocks.env).toMatchObject({
    allowLocalModels: false,
    allowRemoteModels: true,
    backends: {
      onnx: {
        wasm: {
          wasmPaths: {
            mjs: 'https://storage.pomofi.io/runtime/onnxruntime-web/1.27.0/ort-wasm-simd-threaded.asyncify.mjs',
            wasm: 'https://storage.pomofi.io/runtime/onnxruntime-web/1.27.0/ort-wasm-simd-threaded.asyncify.wasm',
          },
        },
      },
    },
    remoteHost: 'https://models.example/',
  })
})

it('should fetch Steam model assets from the local bundle', async () => {
  vi.stubEnv('VITE_POMO_DISTRIBUTION_TARGET', 'steam')
  const nativeFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 200}))
  vi.stubGlobal('fetch', nativeFetch)

  createTransformersRuntime({onProgress: vi.fn()})
  const fetcher = mocks.resumableOptions?.fetcher

  if (fetcher === undefined) {
    throw new Error('The model fetcher was not configured')
  }

  await fetcher('https://storage.pomofi.io/models/text-generation/model/revision/weights.onnx')

  expect(nativeFetch).toHaveBeenCalledWith(
    '/assets-steam/models/text-generation/model/revision/weights.onnx',
    undefined,
  )
})

it('should count and generate Gemma mobile tokens with its tokenizer-bearing processor', async () => {
  const processor = createProcessor()
  const model = {
    generate: vi.fn(async () => {
      mocks.streamerOptions?.callback_function('첫')
      mocks.streamerOptions?.callback_function('둘')
    }),
  }
  mocks.processorFromPretrained.mockResolvedValue(processor)
  mocks.gemmaFromPretrained.mockResolvedValue(model)
  const runtime = createTransformersRuntime({onProgress: vi.fn()})
  await runtime.prepare('gemma-4-e2b-mobile')

  expect(mocks.gemmaProcessorFromPretrained).toHaveBeenCalledWith('repository/gemma-4-e2b-mobile', {
    revision: 'revision-1',
  })

  await expect(runtime.countTokens(messages)).resolves.toBe(7)
  processor.mockResolvedValueOnce({input_ids: {dims: []}})
  await expect(runtime.countTokens(messages)).resolves.toBe(0)
  const onToken = vi.fn()
  await expect(
    runtime.generate({
      maximumTokens: 12,
      messages,
      noRepeatNgramSize: 2,
      onToken,
      repetitionPenalty: 1.1,
      suppressedTokenIds: [3],
      temperature: 0.7,
      topK: 5,
      topP: 0.9,
    }),
  ).resolves.toBe('첫둘')
  expect(onToken).toHaveBeenCalledTimes(2)
  expect(model.generate).toHaveBeenCalledWith(expect.objectContaining({max_new_tokens: 12}))

  await runtime.generate({
    maximumTokens: 1,
    messages,
    noRepeatNgramSize: 0,
    repetitionPenalty: 1,
    temperature: 1,
    topK: 0,
    topP: 1,
  })
})

it('should interrupt Transformers generation when its signal is aborted', async () => {
  const processor = createProcessor()
  let resolveGeneration: (() => void) | undefined
  const model = {
    generate: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveGeneration = resolve
        }),
    ),
  }
  mocks.processorFromPretrained.mockResolvedValue(processor)
  mocks.gemmaFromPretrained.mockResolvedValue(model)
  const runtime = createTransformersRuntime({onProgress: vi.fn()})
  await runtime.prepare('gemma-4-e2b-mobile')

  const controller = new AbortController()
  const generation = runtime.generate({
    maximumTokens: 12,
    messages,
    noRepeatNgramSize: 2,
    repetitionPenalty: 1.1,
    signal: controller.signal,
    suppressedTokenIds: [3],
    temperature: 0.7,
    topK: 5,
    topP: 0.9,
  })

  await vi.waitFor(() => expect(model.generate).toHaveBeenCalledOnce())
  expect(model.generate).toHaveBeenCalledWith(
    expect.objectContaining({stopping_criteria: mocks.stoppingCriteria}),
  )

  controller.abort()
  expect(mocks.interrupt).toHaveBeenCalledOnce()

  resolveGeneration?.()
  await expect(generation).resolves.toBe('')
})

it('should enforce preparation and prompt contracts', async () => {
  const runtime = createTransformersRuntime({onProgress: vi.fn()})
  expect(() => runtime.getTokenizer()).toThrow('토크나이저가 준비되지 않았어요.')
  await expect(runtime.countTokens(messages)).rejects.toThrow('프로세서가 준비되지 않았어요.')
  await expect(
    runtime.generate({
      maximumTokens: 1,
      messages,
      noRepeatNgramSize: 0,
      repetitionPenalty: 1,
      temperature: 1,
      topK: 0,
      topP: 1,
    }),
  ).rejects.toThrow('텍스트 모델이 준비되지 않았어요.')

  const processor = createProcessor()
  processor.apply_chat_template.mockReturnValueOnce({not: 'text'})
  mocks.processorFromPretrained.mockResolvedValue(processor)
  mocks.gemmaFromPretrained.mockResolvedValue({generate: vi.fn()})
  await runtime.prepare('gemma-4-e2b-mobile')
  await expect(runtime.countTokens(messages)).rejects.toThrow('프롬프트를 문자열로')
  await expect(runtime.prepare('gemma-4-e2b')).rejects.toThrow('다른 텍스트 모델')
})

it('should reset failed preparation and load Qwen on retry', async () => {
  const failure = new Error('load failed')
  mocks.processorFromPretrained.mockRejectedValueOnce(failure)
  mocks.loadQwenModel.mockResolvedValue({generate: vi.fn()})
  const runtime = createTransformersRuntime({onProgress: vi.fn()})

  await expect(runtime.prepare('qwen-0.8b')).rejects.toBe(failure)

  const processor = createProcessor()
  mocks.processorFromPretrained.mockResolvedValue(processor)
  await expect(runtime.prepare('qwen-0.8b')).resolves.toBeUndefined()
  expect(mocks.loadQwenModel).toHaveBeenCalledTimes(2)
})

it('should reject Qwen outside development builds', async () => {
  vi.stubEnv('DEV', false)
  mocks.processorFromPretrained.mockResolvedValue(createProcessor())
  const runtime = createTransformersRuntime({onProgress: vi.fn()})

  await expect(runtime.prepare('qwen-0.8b')).rejects.toThrow(
    'Qwen 텍스트 모델은 개발 빌드에서만 사용할 수 있어요.',
  )
})

it('should prepare LFM Q4 and generate through its text-only tokenizer', async () => {
  const textTokenizer = Object.assign(
    vi.fn(() => ({input_ids: {dims: [1, 7]}})),
    tokenizer,
    {apply_chat_template: vi.fn(() => 'prompt')},
  )
  mocks.tokenizerFromPretrained.mockResolvedValue(textTokenizer)
  mocks.lfmFromPretrained.mockResolvedValue({
    generate: vi.fn(async () => {
      mocks.streamerOptions?.callback_function('안녕하세요')
    }),
  })
  const runtime = createTransformersRuntime({onProgress: vi.fn()})
  await runtime.prepare('lfm-1.2b')
  expect(runtime.getTokenizer()).toBe(textTokenizer)
  await expect(runtime.countTokens(messages)).resolves.toBe(7)
  await expect(
    runtime.generate({
      maximumTokens: 12,
      messages,
      noRepeatNgramSize: 0,
      repetitionPenalty: 1,
      temperature: 0.1,
      topK: 50,
      topP: 1,
    }),
  ).resolves.toBe('안녕하세요')
  expect(mocks.lfmFromPretrained).toHaveBeenCalledWith(
    'repository/lfm-1.2b',
    expect.objectContaining({device: 'webgpu', dtype: 'q4'}),
  )
})

it('should consume the template only after its cache clone finishes storing', async () => {
  const response = new Response('QAD template')
  const readText = vi.spyOn(response, 'text')
  const write = Promise.withResolvers<void>()
  const writing = Promise.withResolvers<Response>()
  mocks.tokenizerFromPretrained.mockResolvedValue(tokenizer)
  mocks.loadGgufModel.mockResolvedValue({createChatCompletion: vi.fn()})
  mocks.resumableFetch.mockResolvedValueOnce(response)
  mocks.cachePut.mockImplementationOnce((_url, clone: Response) => {
    writing.resolve(clone)
    return write.promise
  })
  const runtime = createTransformersRuntime({onProgress: vi.fn()})

  const preparation = runtime.prepare('lfm-2.6b-qad')
  const clone = await writing.promise
  expect(clone).not.toBe(response)
  expect(await clone.text()).toBe('QAD template')
  expect(readText).not.toHaveBeenCalled()
  expect(response.bodyUsed).toBe(false)
  expect(mocks.cacheMatch.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.cachePut.mock.invocationCallOrder[0]!,
  )
  expect(mocks.loadGgufModel).not.toHaveBeenCalled()

  write.resolve()
  await preparation
  expect(readText).toHaveBeenCalledOnce()
  expect(mocks.cachePut.mock.invocationCallOrder[0]).toBeLessThan(
    readText.mock.invocationCallOrder[0]!,
  )
  expect(mocks.loadGgufModel).toHaveBeenCalledOnce()
})

it('should reject before consuming the template or allocating GGUF when cache storage rejects', async () => {
  const error = new Error('cache cleanup failed')
  const response = new Response('QAD template')
  const readText = vi.spyOn(response, 'text')
  mocks.tokenizerFromPretrained.mockResolvedValue(tokenizer)
  mocks.resumableFetch.mockResolvedValueOnce(response)
  mocks.cachePut.mockRejectedValueOnce(error)
  const runtime = createTransformersRuntime({onProgress: vi.fn()})

  await expect(runtime.prepare('lfm-2.6b-qad')).rejects.toBe(error)
  expect(readText).not.toHaveBeenCalled()
  expect(response.bodyUsed).toBe(false)
  expect(mocks.loadGgufModel).not.toHaveBeenCalled()
})

it('should reject Qwen outside development before invoking its lazy loader', async () => {
  vi.stubEnv('DEV', false)
  mocks.processorFromPretrained.mockResolvedValue(createProcessor())
  const runtime = createTransformersRuntime({onProgress: vi.fn()})

  await expect(runtime.prepare('qwen-0.8b')).rejects.toThrow(
    'Qwen 텍스트 모델은 개발 빌드에서만 사용할 수 있어요.',
  )
  expect(mocks.loadQwenModel).not.toHaveBeenCalled()
})
