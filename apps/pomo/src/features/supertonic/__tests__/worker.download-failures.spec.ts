/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {ModelResource} from '../../model-storage'
import type {Result} from '../../result'
import type {SupertonicSessions, SupertonicVoice} from '../engine'
import type {SupertonicError} from '../errors'
import type {SupertonicWorkerInput, SupertonicWorkerOutput} from '../messages'
import type {InitializationAssets, ModelAssets} from '../model-assets'
import type {SupertonicModel} from '../model'
import type {SupertonicBackend, SupertonicRuntime} from '../runtime'
import type {LoadBufferOptions} from '../sessions'

const httpMocks = vi.hoisted(() => ({fetch: vi.fn()}))
const storageMocks = vi.hoisted(() => ({
  create: vi.fn(),
  load: vi.fn(),
  report: vi.fn(),
}))
const audioMocks = vi.hoisted(() => ({join: vi.fn()}))
const engineMocks = vi.hoisted(() => ({
  Constructor: vi.fn(),
  createVoice: vi.fn(),
  parseVoice: vi.fn(),
}))
const assetMocks = vi.hoisted(() => ({
  getVoiceUrl: vi.fn(),
  parse: vi.fn(),
}))
const modelMocks = vi.hoisted(() => ({
  getAssetUrl: vi.fn(),
  getModel: vi.fn(),
}))
const runtimeMocks = vi.hoisted(() => ({load: vi.fn()}))
const sessionMocks = vi.hoisted(() => ({load: vi.fn(), release: vi.fn()}))
const textMocks = vi.hoisted(() => ({split: vi.fn()}))

vi.mock('../../http-client', () => ({httpFetch: httpMocks.fetch}))
vi.mock('../../model-storage', () => ({
  createModelStorage: storageMocks.create,
  loadModelResource: storageMocks.load,
  reportModelStorageError: storageMocks.report,
}))
vi.mock('../audio', () => ({joinAudioChunks: audioMocks.join}))
vi.mock('../engine', () => ({
  createSupertonicVoice: engineMocks.createVoice,
  parseSupertonicVoice: engineMocks.parseVoice,
  SupertonicEngine: engineMocks.Constructor,
}))
vi.mock('../model-assets', () => ({
  getVoiceStyleUrl: assetMocks.getVoiceUrl,
  parseInitializationAssets: assetMocks.parse,
}))
vi.mock('../model', () => ({
  getSupertonicAssetUrl: modelMocks.getAssetUrl,
  getSupertonicModel: modelMocks.getModel,
  SUPERTONIC_MODEL_ASSETS_URL: '/manifest.json',
}))
vi.mock('../runtime', () => ({loadSupertonicRuntime: runtimeMocks.load}))
vi.mock('../sessions', () => ({
  loadSessions: sessionMocks.load,
  releaseSessions: sessionMocks.release,
}))
vi.mock('../text-chunking', () => ({splitSpeechText: textMocks.split}))

type WorkerMessageHandler = (event: MessageEvent<SupertonicWorkerInput>) => Promise<void>

interface WorkerScopeMock {
  readonly location: {readonly origin: string}
  readonly navigator: {readonly gpu?: unknown}
  onmessage: WorkerMessageHandler | null
  readonly postMessage: ReturnType<typeof vi.fn>
}

interface EngineMock {
  readonly generate: ReturnType<typeof vi.fn>
  readonly release: ReturnType<typeof vi.fn>
  readonly sampleRate: number
}

const success = <Value>(value: Value): Result<Value, never> => ({ok: true, value})
const failure = <ErrorValue>(error: ErrorValue): Result<never, ErrorValue> => ({error, ok: false})

const backendError = (backend: SupertonicBackend = 'webgpu'): SupertonicError => ({
  backend,
  code: 'backend-failed',
  detail: 'backend unavailable',
  phase: 'initialize',
  retryable: backend === 'webgpu',
})

const validationError: SupertonicError = {
  asset: 'manifest',
  code: 'invalid-model-data',
  phase: 'validate',
  retryable: false,
}

const modelAssets = {
  models: {supertonic3: {revision: 'test', voiceStyles: {}}},
  version: 1,
} as unknown as ModelAssets

const initializationAssets = {
  config: {
    ae: {base_chunk_size: 1, sample_rate: 24_000},
    ttl: {chunk_compress_factor: 1, latent_dim: 1},
  },
  indexer: [],
  modelAssets,
} satisfies InitializationAssets

const fullModel = {
  baseUrl: 'https://models.test/full',
  description: 'test model',
  files: [],
  id: 'full',
  label: 'Full',
  preferredBackend: 'webgpu',
  size: 0,
  speechPolicy: {
    considerSplitLength: 120,
    locale: 'ko',
    maximumLength: 200,
    recommendedLength: 150,
    silenceDuration: 0.3,
  },
} satisfies SupertonicModel

const wasmModel = {
  ...fullModel,
  id: 'int8',
  label: 'INT8',
  preferredBackend: 'wasm',
} satisfies SupertonicModel
const runtime = {} as SupertonicRuntime
const sessions = {} as SupertonicSessions
const voice = {} as SupertonicVoice
let currentEngine: EngineMock

const jsonResponse = (value: unknown = {ok: true}, status = 200) =>
  new Response(JSON.stringify(value), {
    headers: {'content-type': 'application/json'},
    status,
  })

const modelResource = (response: Response): ModelResource => ({
  cacheWrite: Promise.resolve(success(undefined)),
  response,
  source: 'network',
})

const createScope = (hasGpu: boolean): WorkerScopeMock => ({
  location: {origin: 'https://pomo.test'},
  navigator: hasGpu ? {gpu: {}} : {},
  onmessage: null,
  postMessage: vi.fn(),
})

const loadWorker = async (hasGpu = true) => {
  const scope = createScope(hasGpu)
  vi.stubGlobal('self', scope)
  await import('../worker')

  const dispatch = async (message: SupertonicWorkerInput) => {
    if (scope.onmessage === null) {
      throw new Error('Expected the Supertonic Worker message listener to be registered.')
    }

    await scope.onmessage({data: message} as MessageEvent<SupertonicWorkerInput>)
  }

  return {dispatch, scope}
}

const initialize = async (
  worker: Awaited<ReturnType<typeof loadWorker>>,
  modelId: 'full' | 'int8' = 'full',
) => {
  await worker.dispatch({modelId, type: 'initialize'})
}

const generateMessage = (
  overrides: Partial<Extract<SupertonicWorkerInput, {type: 'generate'}>> = {},
): Extract<SupertonicWorkerInput, {type: 'generate'}> => ({
  language: 'ko',
  requestId: 7,
  speed: 1,
  text: '안녕하세요.',
  type: 'generate',
  voice: {
    kind: 'custom',
    value: {duration: {data: [1], dimensions: [1]}, speech: {data: [1], dimensions: [1]}},
  },
  ...overrides,
})

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  currentEngine = {
    generate: vi.fn().mockResolvedValue(Float32Array.of(0.1, 0.2)),
    release: vi.fn().mockResolvedValue(undefined),
    sampleRate: 24_000,
  }
  storageMocks.create.mockReturnValue({})
  storageMocks.load.mockImplementation(async () => modelResource(jsonResponse()))
  httpMocks.fetch.mockImplementation(async () => jsonResponse())
  audioMocks.join.mockReturnValue(Float32Array.of(0.1, 0.2))
  engineMocks.Constructor.mockImplementation(function createEngineMock() {
    return currentEngine
  })
  engineMocks.createVoice.mockReturnValue(voice)
  engineMocks.parseVoice.mockReturnValue(success(voice))
  assetMocks.getVoiceUrl.mockReturnValue('https://models.test/voice.json')
  assetMocks.parse.mockReturnValue(success(initializationAssets))
  modelMocks.getAssetUrl.mockImplementation((path: string) => `https://models.test/${path}`)
  modelMocks.getModel.mockReturnValue(fullModel)
  runtimeMocks.load.mockResolvedValue(runtime)
  sessionMocks.load.mockResolvedValue(success(sessions))
  sessionMocks.release.mockResolvedValue(undefined)
  textMocks.split.mockImplementation((text: string) => [text])
  vi.spyOn(performance, 'now').mockReturnValue(100)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('initialization download failures', () => {
  it.each([
    {expectedRetryable: false, status: 400},
    {expectedRetryable: false, status: 401},
  ])('should report manifest HTTP $status without retry', async ({expectedRetryable, status}) => {
    httpMocks.fetch.mockResolvedValue(jsonResponse({}, status))
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'download-failed',
          fileName: '모델 자산 설정',
          phase: 'download',
          retryable: expectedRetryable,
          status,
        },
        requestId: null,
        type: 'error',
      },
      [],
    )
  })

  it.each([
    {error: new DOMException('cancelled', 'AbortError'), expectedCode: 'cancelled'},
    {error: new Error('offline'), expectedCode: 'download-failed'},
  ])(
    'should classify manifest fetch exceptions as $expectedCode',
    async ({error, expectedCode}) => {
      httpMocks.fetch.mockRejectedValue(error)
      const worker = await loadWorker()

      await initialize(worker)

      expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({code: expectedCode}),
          requestId: null,
          type: 'error',
        }),
        [],
      )
    },
  )

  it('should return a retryable 408 config response', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      modelResource(options.url.endsWith('tts.json') ? jsonResponse({}, 408) : jsonResponse()),
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({code: 'download-failed', retryable: true, status: 408}),
      }),
      [],
    )
  })

  it('should return a retryable 429 indexer response after config succeeds', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      modelResource(
        options.url.endsWith('unicode_indexer.json') ? jsonResponse({}, 429) : jsonResponse(),
      ),
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({code: 'download-failed', retryable: true, status: 429}),
      }),
      [],
    )
  })

  it('should classify aborted config loading as cancellation', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) => {
      if (options.url.endsWith('tts.json')) {
        throw new DOMException('cancelled', 'AbortError')
      }

      return modelResource(jsonResponse())
    })
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({error: {code: 'cancelled', phase: 'download', retryable: false}}),
      [],
    )
  })

  it('should report a generic indexer loading exception', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) => {
      if (options.url.endsWith('unicode_indexer.json')) {
        throw new Error('offline')
      }

      return modelResource(jsonResponse())
    })
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({code: 'download-failed', retryable: true, status: null}),
      }),
      [],
    )
  })

  it('should return initialization asset validation failures', async () => {
    assetMocks.parse.mockReturnValue(failure(validationError))
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {error: validationError, requestId: null, type: 'error'},
      [],
    )
  })

  it('should return retryable server errors from model buffer loading', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      modelResource(
        options.url.endsWith('.onnx') ? new Response(null, {status: 500}) : jsonResponse(),
      ),
    )
    sessionMocks.load.mockImplementation(
      async (options: {
        loadBuffer: (
          bufferOptions: LoadBufferOptions,
        ) => Promise<Result<ArrayBuffer, SupertonicError>>
      }) =>
        options.loadBuffer({
          expectedSize: 1,
          fileName: '모델 파일',
          loadedBefore: 0,
          signal: new AbortController().signal,
          totalBytes: 1,
          url: 'https://models.test/model.onnx',
        }),
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({retryable: true, status: 500}),
      }),
      [],
    )
  })

  it.each([
    {error: new DOMException('cancelled', 'AbortError'), expectedCode: 'cancelled'},
    {error: new Error('offline'), expectedCode: 'download-failed'},
  ])('should classify model buffer exceptions as $expectedCode', async ({error, expectedCode}) => {
    storageMocks.load.mockImplementation(async (options: {url: string}) => {
      if (options.url.endsWith('.onnx')) {
        throw error
      }

      return modelResource(jsonResponse())
    })
    sessionMocks.load.mockImplementation(
      async (options: {
        loadBuffer: (
          bufferOptions: LoadBufferOptions,
        ) => Promise<Result<ArrayBuffer, SupertonicError>>
      }) =>
        options.loadBuffer({
          expectedSize: 1,
          fileName: '모델 파일',
          loadedBefore: 0,
          signal: new AbortController().signal,
          totalBytes: 1,
          url: 'https://models.test/model.onnx',
        }),
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({error: expect.objectContaining({code: expectedCode})}),
      [],
    )
  })
})
