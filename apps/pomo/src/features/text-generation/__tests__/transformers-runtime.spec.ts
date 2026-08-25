import {beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  cacheOptions: null as null | Record<string, (...args: never[]) => unknown>,
  deletePartial: vi.fn(),
  env: {} as Record<string, unknown>,
  gemmaFromPretrained: vi.fn(),
  loadQwenModel: vi.fn(),
  onProgress: vi.fn(),
  processorFromPretrained: vi.fn(),
  reportStorageError: vi.fn(),
  streamerOptions: null as null | {callback_function: (text: string) => void},
}))

vi.mock('@huggingface/transformers', () => ({
  AutoProcessor: {from_pretrained: mocks.processorFromPretrained},
  env: mocks.env,
  Gemma4ForCausalLM: {from_pretrained: mocks.gemmaFromPretrained},
  TextStreamer: class TextStreamerMock {
    constructor(_tokenizer: unknown, options: {callback_function: (text: string) => void}) {
      mocks.streamerOptions = options
    }
  },
}))
vi.mock('../model', () => ({
  getTextModelImplementation: (modelId: string) => ({
    architecture: modelId.startsWith('qwen') ? 'qwen-3.5' : 'gemma-4',
    assetSource: {
      host: 'https://models.example/',
      pathTemplate: 'models/{model}/{revision}/',
      revision: 'revision-1',
    },
    id: modelId,
    quantization: 'q4',
    repositoryId: `repository/${modelId}`,
  }),
}))
vi.mock('../qwen-model', () => ({loadQwenModel: mocks.loadQwenModel}))
vi.mock('../../model-storage', () => ({
  createModelStorage: vi.fn(() => ({storage: true})),
  createResumableModelFetch: vi.fn(() => ({
    deletePartial: mocks.deletePartial,
    fetch: vi.fn(),
  })),
  createTransformersModelCache: vi.fn((options: Record<string, (...args: never[]) => unknown>) => {
    mocks.cacheOptions = options
    return {cache: true}
  }),
  reportModelStorageError: mocks.reportStorageError,
}))

import {createTransformersRuntime} from '../transformers-runtime'

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
  mocks.cacheOptions = null
  mocks.streamerOptions = null
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
    remoteHost: 'https://models.example/',
  })
})

it('should count and generate tokens through the prepared processor', async () => {
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
