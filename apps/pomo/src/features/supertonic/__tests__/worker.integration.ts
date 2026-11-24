/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'
import type {Result} from 'src/features/result'
import type {SupertonicSessions} from '@winter-love/supertonic/engine'
import type {SupertonicError} from '@winter-love/supertonic/errors'
import type {SupertonicModel} from '@winter-love/supertonic/model'
import type {SupertonicBackend} from '@winter-love/supertonic/runtime'
import type {LoadBufferOptions} from '@winter-love/supertonic/sessions'
import {
  failure,
  fullModel,
  initialize,
  jsonResponse,
  loadWorker,
  modelMocks,
  modelResource,
  runtime,
  runtimeMocks,
  sessionMocks,
  sessions,
  storageMocks,
  success,
  validationError,
} from './fixtures/worker'

const backendError = (backend: SupertonicBackend = 'webgpu'): SupertonicError => ({
  backend,
  code: 'backend-failed',
  detail: 'backend unavailable',
  phase: 'initialize',
  retryable: backend === 'webgpu',
})

const wasmModel = {
  ...fullModel,
  id: 'int8',
  label: 'INT8',
  preferredBackend: 'wasm',
} satisfies SupertonicModel

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
