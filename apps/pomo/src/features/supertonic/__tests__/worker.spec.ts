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

describe('initialization', () => {
  it('should reject an unsupported model id', async () => {
    modelMocks.getModel.mockImplementation(() => {
      throw new Error('invalid model')
    })
    const worker = await loadWorker()

    await worker.dispatch({modelId: 'full', type: 'initialize'})

    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {
        error: {
          code: 'invalid-model',
          modelId: 'full',
          phase: 'initialize',
          retryable: false,
        },
        requestId: null,
        type: 'error',
      },
      [],
    )
  })

  it('should initialize WebGPU and stream model bytes with bounded progress', async () => {
    const cacheError = {cause: new Error('cache full'), operation: 'write'} as const
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Uint8Array.of(1, 2))
        controller.enqueue(Uint8Array.of(3, 4))
        controller.close()
      },
    })
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      options.url.endsWith('.onnx')
        ? {
            cacheWrite: Promise.resolve(failure(cacheError)),
            response: new Response(stream),
            source: 'network' as const,
          }
        : modelResource(jsonResponse()),
    )
    sessionMocks.load.mockImplementation(
      async (options: {
        loadBuffer: (
          bufferOptions: LoadBufferOptions,
        ) => Promise<Result<ArrayBuffer, SupertonicError>>
      }) => {
        const buffer = await options.loadBuffer({
          expectedSize: 3,
          fileName: '음성 모델',
          loadedBefore: 5,
          signal: new AbortController().signal,
          totalBytes: 20,
          url: 'https://models.test/model.onnx',
        })
        expect(buffer).toEqual(success(Uint8Array.of(1, 2, 3, 4).buffer))
        return success(sessions)
      },
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(runtimeMocks.load).toHaveBeenCalledWith('webgpu')
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {
        progress: {fileName: '음성 모델', loadedBytes: 7, totalBytes: 20},
        type: 'progress',
      },
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {
        progress: {fileName: '음성 모델', loadedBytes: 8, totalBytes: 20},
        type: 'progress',
      },
      [],
    )
    expect(storageMocks.report).toHaveBeenCalledWith(cacheError)
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {backend: 'webgpu', type: 'ready'},
      [],
    )
  })

  it('should load a bodyless model response and keep a successful cache write silent', async () => {
    const buffer = Uint8Array.of(9, 8).buffer
    const response = {
      arrayBuffer: vi.fn().mockResolvedValue(buffer),
      body: null,
      ok: true,
    } as unknown as Response
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      options.url.endsWith('.onnx') ? modelResource(response) : modelResource(jsonResponse()),
    )
    sessionMocks.load.mockImplementation(
      async (options: {
        loadBuffer: (
          bufferOptions: LoadBufferOptions,
        ) => Promise<Result<ArrayBuffer, SupertonicError>>
      }) => {
        const result = await options.loadBuffer({
          expectedSize: 2,
          fileName: '보코더',
          loadedBefore: 0,
          signal: new AbortController().signal,
          totalBytes: 2,
          url: 'https://models.test/vocoder.onnx',
        })
        expect(result).toEqual(success(buffer))
        return success(sessions)
      },
    )
    const worker = await loadWorker(false)

    await initialize(worker)

    expect(runtimeMocks.load).toHaveBeenCalledWith('wasm')
    expect(storageMocks.report).not.toHaveBeenCalled()
  })

  it('should fall back from a WebGPU session failure to WASM', async () => {
    sessionMocks.load
      .mockResolvedValueOnce(failure(backendError('webgpu')))
      .mockResolvedValueOnce(success(sessions))
    runtimeMocks.load.mockResolvedValueOnce({backend: 'webgpu'}).mockResolvedValueOnce(runtime)
    const worker = await loadWorker()

    await initialize(worker)

    expect(runtimeMocks.load).toHaveBeenNthCalledWith(1, 'webgpu')
    expect(runtimeMocks.load).toHaveBeenNthCalledWith(2, 'wasm')
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {message: 'WebGPU를 사용할 수 없어 WASM으로 다시 준비하고 있어요.', type: 'status'},
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith({backend: 'wasm', type: 'ready'}, [])
  })

  it('should return a non-backend session failure without fallback', async () => {
    sessionMocks.load.mockResolvedValue(failure(validationError))
    const worker = await loadWorker()

    await initialize(worker)

    expect(runtimeMocks.load).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {error: validationError, requestId: null, type: 'error'},
      [],
    )
  })

  it('should not fall back when a WASM backend session fails', async () => {
    modelMocks.getModel.mockReturnValue(wasmModel)
    sessionMocks.load.mockResolvedValue(failure(backendError('wasm')))
    const worker = await loadWorker()

    await initialize(worker, 'int8')

    expect(runtimeMocks.load).toHaveBeenCalledWith('wasm')
    expect(runtimeMocks.load).toHaveBeenCalledOnce()
  })

  it('should release sessions when disposal aborts initialization', async () => {
    let finishSessions: (result: Result<SupertonicSessions, SupertonicError>) => void = () =>
      undefined
    sessionMocks.load.mockReturnValue(
      new Promise((resolve) => {
        finishSessions = resolve
      }),
    )
    const worker = await loadWorker()
    const initializing = initialize(worker)
    await vi.waitFor(() => expect(sessionMocks.load).toHaveBeenCalledOnce())

    await worker.dispatch({type: 'dispose'})
    finishSessions(success(sessions))
    await initializing

    expect(sessionMocks.release).toHaveBeenCalledWith(sessions)
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {
        error: {code: 'cancelled', phase: 'initialize', retryable: false},
        requestId: null,
        type: 'error',
      },
      [],
    )
  })

  it('should keep the latest initialization controller active', async () => {
    let finishFirst: (result: Result<SupertonicSessions, SupertonicError>) => void = () => undefined
    sessionMocks.load
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve
        }),
      )
      .mockResolvedValueOnce(success(sessions))
    const worker = await loadWorker()
    const first = initialize(worker)
    await vi.waitFor(() => expect(sessionMocks.load).toHaveBeenCalledOnce())

    await initialize(worker)
    finishFirst(success(sessions))
    await first

    expect(worker.scope.postMessage).toHaveBeenCalledTimes(2)
  })
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

describe('generation', () => {
  it('should reject generation before a model is ready and ignore idle cancellation', async () => {
    const worker = await loadWorker()

    await worker.dispatch({type: 'cancel-generation'})
    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'model-not-ready', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should generate and transfer custom-voice audio in ordered chunks', async () => {
    textMocks.split.mockReturnValue(['첫 문장', '둘째 문장'])
    currentEngine.generate
      .mockImplementationOnce(
        async (options: {onProgress: (step: number, total: number) => void}) => {
          options.onProgress(1, 2)
          return Float32Array.of(1)
        },
      )
      .mockResolvedValueOnce(Float32Array.of(2))
    const joined = Float32Array.of(1, 0, 2)
    audioMocks.join.mockReturnValue(joined)
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage())

    expect(currentEngine.generate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({language: 'ko', speed: 1, text: '첫 문장', voice}),
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      {message: '음성 1/2 다듬는 중 1/2', type: 'status'},
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({index: 1, requestId: 7, total: 2, type: 'chunk'}),
      [],
    )
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        generationTime: 0,
        requestId: 7,
        sampleRate: 24_000,
        samples: joined,
        type: 'result',
      },
      [joined.buffer],
    )
  })

  it('should fetch and cache a preset voice between generations', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    const message = generateMessage({voice: {id: 'Yuna', kind: 'preset'}})

    await worker.dispatch(message)
    await worker.dispatch({...message, requestId: 8})

    expect(assetMocks.getVoiceUrl).toHaveBeenCalledOnce()
    expect(engineMocks.parseVoice).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({requestId: 8, type: 'result'}),
      expect.any(Array),
    )
  })

  it('should return a preset voice validation failure without caching it', async () => {
    const voiceError = {...validationError, asset: 'voice'} as const
    engineMocks.parseVoice.mockReturnValue(failure(voiceError))
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage({voice: {id: 'Yuna', kind: 'preset'}}))

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {error: voiceError, requestId: 7, type: 'error'},
      [],
    )
  })

  it('should return a preset voice download failure', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      modelResource(
        options.url === 'https://models.test/voice.json' ? jsonResponse({}, 400) : jsonResponse(),
      ),
    )
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage({voice: {id: 'Yuna', kind: 'preset'}}))

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'download-failed',
          fileName: 'Yuna 목소리',
          phase: 'download',
          retryable: false,
          status: 400,
        },
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should reject preset generation when model assets are unavailable', async () => {
    assetMocks.parse.mockReturnValue(
      success({...initializationAssets, modelAssets: null as unknown as ModelAssets}),
    )
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage({voice: {id: 'Yuna', kind: 'preset'}}))

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'model-not-ready', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should reject voice creation when the active runtime is unavailable', async () => {
    runtimeMocks.load.mockResolvedValue(null)
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'model-not-ready', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should stop after a generation cancellation between chunks', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    currentEngine.generate.mockImplementationOnce(async () => {
      await worker.dispatch({type: 'cancel-generation'})
      return Float32Array.of(1)
    })

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {code: 'cancelled', phase: 'generate', retryable: false},
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should stop after cancellation once empty chunks are joined', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    textMocks.split.mockImplementation(() => {
      void worker.dispatch({type: 'cancel-generation'})
      return []
    })

    await worker.dispatch(generateMessage())

    expect(audioMocks.join).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({error: expect.objectContaining({code: 'cancelled'})}),
      [],
    )
  })

  it('should serialize unknown engine failures', async () => {
    currentEngine.generate.mockRejectedValue('generation failed')
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'worker-failed',
          detail: '알 수 없는 오류',
          phase: 'generate',
          retryable: true,
        },
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should preserve the latest controller across concurrent generations', async () => {
    let finishFirst: (samples: Float32Array) => void = () => undefined
    currentEngine.generate
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve
        }),
      )
      .mockResolvedValueOnce(Float32Array.of(2))
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    const first = worker.dispatch(generateMessage({requestId: 1}))
    await vi.waitFor(() => expect(currentEngine.generate).toHaveBeenCalledOnce())

    await worker.dispatch(generateMessage({requestId: 2}))
    finishFirst(Float32Array.of(1))
    await first

    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({requestId: 1, type: 'result'}),
      expect.any(Array),
    )
    expect(worker.scope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({requestId: 2, type: 'result'}),
      expect.any(Array),
    )
  })
})

describe('worker lifecycle failures', () => {
  it('should dispose an initialized engine exactly once', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch({type: 'dispose'})
    await worker.dispatch({type: 'dispose'})

    expect(currentEngine.release).toHaveBeenCalledOnce()
    expect(worker.scope.postMessage).toHaveBeenNthCalledWith(1, {type: 'disposed'}, [])
    expect(worker.scope.postMessage).toHaveBeenNthCalledWith(2, {type: 'disposed'}, [])
  })

  it('should serialize runtime initialization failures', async () => {
    runtimeMocks.load.mockRejectedValue(new Error('runtime failed'))
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'worker-failed',
          detail: 'runtime failed',
          phase: 'initialize',
          retryable: true,
        },
        requestId: null,
        type: 'error',
      },
      [],
    )
  })

  it('should recover when posting a generated result throws', async () => {
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()
    textMocks.split.mockReturnValue([])
    worker.scope.postMessage.mockImplementationOnce(() => {
      throw new Error('transfer failed')
    })

    await worker.dispatch(generateMessage())

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'worker-failed',
          detail: 'transfer failed',
          phase: 'generate',
          retryable: true,
        },
        requestId: 7,
        type: 'error',
      },
      [],
    )
  })

  it('should ignore an unknown message at runtime', async () => {
    const worker = await loadWorker()

    await worker.dispatch({type: 'unknown'} as unknown as SupertonicWorkerInput)

    expect(worker.scope.postMessage).not.toHaveBeenCalled()
  })

  it('should report engine release failures as initialization lifecycle errors', async () => {
    currentEngine.release.mockRejectedValue(new Error('release failed'))
    const worker = await loadWorker()
    await initialize(worker)
    worker.scope.postMessage.mockClear()

    await worker.dispatch({type: 'dispose'})

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({detail: 'release failed', phase: 'initialize'}),
        requestId: null,
      }),
      [],
    )
  })
})
