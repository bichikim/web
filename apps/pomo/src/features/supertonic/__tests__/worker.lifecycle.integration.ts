/** @vitest-environment jsdom */
import {describe, expect, it, vi} from 'vitest'
import type {ModelAssets} from '../model-assets'
import type {SupertonicWorkerInput} from '../messages'
import {
  assetMocks,
  audioMocks,
  currentEngine,
  engineMocks,
  failure,
  fullModel,
  generateMessage,
  initializationAssets,
  initialize,
  jsonResponse,
  loadWorker,
  modelAssets,
  modelResource,
  runtime,
  runtimeMocks,
  storageMocks,
  success,
  textMocks,
  validationError,
  voice,
} from './fixtures/generation'

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
