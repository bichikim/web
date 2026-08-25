import {createComputed, createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import type {SupertonicClient} from '../../supertonic'
import {failureResult, successResult} from '../../result'
import {createModelDownloadController, type ModelDownloadRuntime} from '../index'
import type {TextModelDownloadResponse} from '../text-client'

const createRuntime = () => {
  let onResponse: ((response: TextModelDownloadResponse) => void) | null = null
  const client = {dispose: vi.fn(), prepare: vi.fn()}
  const runtime: ModelDownloadRuntime = {
    createTextClient: vi.fn((options) => {
      onResponse = options.onResponse
      return client
    }),
    createVoiceClient: vi.fn(() => {
      throw new Error('음성 client를 만들면 안 됩니다.')
    }),
  }

  return {
    client,
    emit: (response: TextModelDownloadResponse) => {
      if (onResponse === null) {
        throw new Error('모델 다운로드 client가 생성되지 않았습니다.')
      }

      onResponse(response)
    },
    runtime,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should share one active download and complete every waiter', async () => {
  const testRuntime = createRuntime()
  const controller = createModelDownloadController(testRuntime.runtime)

  const firstDownload = controller.startTextModel('gemma-4-e2b')
  const secondDownload = controller.startTextModel('gemma-4-e2b')

  expect(secondDownload).toBe(firstDownload)
  expect(testRuntime.runtime.createTextClient).toHaveBeenCalledTimes(1)
  expect(testRuntime.client.prepare).toHaveBeenCalledWith({
    modelId: 'gemma-4-e2b',
    type: 'prepare',
  })

  testRuntime.emit({
    files: [],
    loadedBytes: 50,
    percentage: 50,
    totalBytes: 100,
    type: 'loading',
  })
  testRuntime.emit({type: 'unknown'} as unknown as TextModelDownloadResponse)
  expect(controller.state()).toEqual({
    label: 'Gemma 4 E2B',
    percentage: 50,
    status: 'loading',
    target: {kind: 'text', modelId: 'gemma-4-e2b'},
  })

  testRuntime.emit({type: 'ready'})

  await expect(firstDownload).resolves.toEqual({status: 'complete'})
  await expect(secondDownload).resolves.toEqual({status: 'complete'})
  expect(controller.state()).toEqual({status: 'idle'})
  expect(testRuntime.client.dispose).toHaveBeenCalledTimes(1)
})

it('should terminate the Worker and resolve cancellation without accepting late responses', async () => {
  const testRuntime = createRuntime()
  const controller = createModelDownloadController(testRuntime.runtime)
  const download = controller.startTextModel('gemma-4-e2b')

  controller.cancel()
  testRuntime.emit({files: [], loadedBytes: 25, percentage: 25, totalBytes: 100, type: 'loading'})
  testRuntime.emit({message: 'late error', restartRequired: false, type: 'error'})
  testRuntime.emit({type: 'ready'})

  await expect(download).resolves.toEqual({status: 'cancelled'})
  expect(testRuntime.client.dispose).toHaveBeenCalledTimes(1)
  expect(controller.state()).toEqual({status: 'idle'})
  controller.cancel()
  controller.dispose()
  controller.dismissError()
  expect(controller.state()).toEqual({status: 'idle'})
})

it('should expose a dismissible error and reject a different concurrent model', async () => {
  const testRuntime = createRuntime()
  const controller = createModelDownloadController(testRuntime.runtime)
  const download = controller.startTextModel('gemma-4-e2b')

  await expect(controller.startTextModel('gemma-4-e2b-mobile')).resolves.toEqual({
    message: '다른 모델을 내려받고 있어요. 완료하거나 취소한 뒤 다시 시도해 주세요.',
    status: 'error',
  })
  testRuntime.emit({message: '저장 공간이 부족해요.', restartRequired: false, type: 'error'})

  await expect(download).resolves.toEqual({message: '저장 공간이 부족해요.', status: 'error'})
  expect(controller.state()).toEqual({
    label: 'Gemma 4 E2B',
    message: '저장 공간이 부족해요.',
    status: 'error',
    target: {kind: 'text', modelId: 'gemma-4-e2b'},
  })

  controller.dismissError()
  expect(controller.state()).toEqual({status: 'idle'})
})

it('should download a voice model through the same global lifecycle', async () => {
  const dispose = vi.fn()
  const initialize = vi.fn<SupertonicClient['initialize']>(async (options) => {
    options.onStatus('음성 모델 준비 중')
    options.onProgress({fileName: 'vocoder.onnx', loadedBytes: 75, totalBytes: 100})
    return successResult(undefined)
  })
  const voiceClient: SupertonicClient = {
    cancelGeneration: vi.fn(),
    dispose,
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize,
  }
  const runtime: ModelDownloadRuntime = {
    createTextClient: vi.fn(() => {
      throw new Error('텍스트 client를 만들면 안 됩니다.')
    }),
    createVoiceClient: vi.fn(() => voiceClient),
  }
  const controller = createModelDownloadController(runtime)
  const download = controller.startVoiceModel('int8')

  expect(controller.state()).toEqual({
    label: 'INT8 음성',
    percentage: 75,
    status: 'loading',
    target: {kind: 'voice', modelId: 'int8'},
  })
  await expect(download).resolves.toEqual({status: 'complete'})
  expect(dispose).toHaveBeenCalledTimes(1)
  expect(controller.state()).toEqual({status: 'idle'})
})

it('should expose a typed voice initialization failure and zero-byte progress', async () => {
  const dispose = vi.fn()
  const initialize = vi.fn<SupertonicClient['initialize']>(async (options) => {
    options.onProgress({fileName: 'vocoder.onnx', loadedBytes: 0, totalBytes: 0})
    return failureResult({
      code: 'download-failed',
      fileName: 'vocoder.onnx',
      phase: 'download',
      retryable: true,
      status: 503,
    })
  })
  const voiceClient: SupertonicClient = {
    cancelGeneration: vi.fn(),
    dispose,
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize,
  }
  const runtime: ModelDownloadRuntime = {
    createTextClient: vi.fn(() => {
      throw new Error('텍스트 client를 만들면 안 됩니다.')
    }),
    createVoiceClient: vi.fn(() => voiceClient),
  }
  const controller = createModelDownloadController(runtime)

  await expect(controller.startVoiceModel('int8')).resolves.toEqual({
    message: 'vocoder.onnx 다운로드에 실패했어요. (503)',
    status: 'error',
  })
  expect(controller.state()).toEqual({
    label: 'INT8 음성',
    message: 'vocoder.onnx 다운로드에 실패했어요. (503)',
    status: 'error',
    target: {kind: 'voice', modelId: 'int8'},
  })
  expect(dispose).toHaveBeenCalledOnce()
})

it('should normalize a non-error voice initialization rejection', async () => {
  const dispose = vi.fn()
  const voiceClient: SupertonicClient = {
    cancelGeneration: vi.fn(),
    dispose,
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize: vi.fn().mockRejectedValue('network unavailable'),
  }
  const runtime: ModelDownloadRuntime = {
    createTextClient: vi.fn(() => {
      throw new Error('텍스트 client를 만들면 안 됩니다.')
    }),
    createVoiceClient: vi.fn(() => voiceClient),
  }
  const controller = createModelDownloadController(runtime)

  await expect(controller.startVoiceModel('full')).resolves.toEqual({
    message: '모델 파일을 내려받지 못했어요.',
    status: 'error',
  })
  expect(dispose).toHaveBeenCalledOnce()
})

it('should ignore a stale completion after an idle observer cancels the download', async () => {
  const testRuntime = createRuntime()
  const controller = createModelDownloadController(testRuntime.runtime)
  const download = controller.startTextModel('gemma-4-e2b')
  const disposeRoot = createRoot((dispose) => {
    createComputed(() => {
      if (controller.state().status === 'idle') {
        controller.cancel()
      }
    })
    return dispose
  })

  testRuntime.emit({type: 'ready'})

  await expect(download).resolves.toEqual({status: 'cancelled'})
  expect(testRuntime.client.dispose).toHaveBeenCalledOnce()
  disposeRoot()
})

it('should retain a safe resolver when Promise execution is deferred', () => {
  const NativePromise = Promise
  function DeferredExecutorPromise<Value>(
    executor: (
      resolve: (value: PromiseLike<Value> | Value) => void,
      reject: (reason?: unknown) => void,
    ) => void,
  ) {
    void executor
    return NativePromise.resolve(undefined as Value)
  }

  const testRuntime = createRuntime()
  const controller = createModelDownloadController(testRuntime.runtime)
  testRuntime.client.prepare.mockImplementation(() => testRuntime.emit({type: 'ready'}))
  vi.stubGlobal('Promise', DeferredExecutorPromise)

  try {
    controller.startTextModel('gemma-4-e2b')
  } finally {
    vi.stubGlobal('Promise', NativePromise)
  }

  expect(controller.state()).toEqual({status: 'idle'})
  expect(testRuntime.client.dispose).toHaveBeenCalledOnce()
})

it('should expose a client creation failure through the download result and state', async () => {
  const runtime: ModelDownloadRuntime = {
    createTextClient: vi.fn(() => {
      throw new Error('Worker를 만들지 못했어요.')
    }),
    createVoiceClient: vi.fn(() => {
      throw new Error('음성 client를 만들면 안 됩니다.')
    }),
  }
  const controller = createModelDownloadController(runtime)

  await expect(controller.startTextModel('gemma-4-e2b')).resolves.toEqual({
    message: 'Worker를 만들지 못했어요.',
    status: 'error',
  })
  expect(controller.state()).toEqual({
    label: 'Gemma 4 E2B',
    message: 'Worker를 만들지 못했어요.',
    status: 'error',
    target: {kind: 'text', modelId: 'gemma-4-e2b'},
  })
})

it('should dispose and resolve an error when model preparation fails synchronously', async () => {
  const dispose = vi.fn()
  const runtime: ModelDownloadRuntime = {
    createTextClient: vi.fn(() => ({
      dispose,
      prepare: () => {
        throw new Error('Worker 요청을 보내지 못했어요.')
      },
    })),
    createVoiceClient: vi.fn(() => {
      throw new Error('음성 client를 만들면 안 됩니다.')
    }),
  }
  const controller = createModelDownloadController(runtime)

  await expect(controller.startTextModel('gemma-4-e2b')).resolves.toEqual({
    message: 'Worker 요청을 보내지 못했어요.',
    status: 'error',
  })
  expect(dispose).toHaveBeenCalledTimes(1)
  expect(controller.state()).toEqual({
    label: 'Gemma 4 E2B',
    message: 'Worker 요청을 보내지 못했어요.',
    status: 'error',
    target: {kind: 'text', modelId: 'gemma-4-e2b'},
  })
})
