/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {
  PrepareTextModelRequest,
  TextGenerationErrorResponse,
  TextGenerationLoadingResponse,
  TextGenerationReadyResponse,
} from '../../text-generation/messages'
import type {TextGenerationProgress} from '../../text-generation/progress'

const runtimeMocks = vi.hoisted(() => ({
  create: vi.fn(),
  download: vi.fn(),
}))

vi.mock('../../text-generation/download-text-model', () => ({
  downloadTextModel: runtimeMocks.download,
}))
vi.mock('../../text-generation/execution', () => ({
  createTextGenerationExecutor: runtimeMocks.create,
}))

type TextWorkerResponse =
  | TextGenerationErrorResponse
  | TextGenerationLoadingResponse
  | TextGenerationReadyResponse
type WorkerMessageListener = (event: MessageEvent<PrepareTextModelRequest>) => void

const PROGRESS: TextGenerationProgress = {
  files: [
    {
      fileName: 'model.onnx',
      loadedBytes: 40,
      percentage: 40,
      totalBytes: 100,
    },
  ],
  loadedBytes: 40,
  percentage: 40,
  totalBytes: 100,
}

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: TextWorkerResponse) => void>()
  const addEventListener = vi.fn((type: string, listener: WorkerMessageListener) => {
    if (type === 'message') {
      messageListener = listener
    }
  })

  vi.stubGlobal('self', {addEventListener, postMessage})
  await import('../text-worker')

  return {
    addEventListener,
    dispatch: (request: PrepareTextModelRequest) => {
      if (messageListener === null) {
        throw new Error('텍스트 모델 다운로드 Worker 리스너가 등록되지 않았습니다.')
      }

      messageListener({data: request} as MessageEvent<PrepareTextModelRequest>)
    },
    postMessage,
  }
}

const waitForResponse = async (
  worker: Awaited<ReturnType<typeof loadWorker>>,
  type: TextWorkerResponse['type'],
) => {
  await vi.waitFor(() => {
    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({type}))
  })
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  runtimeMocks.download.mockResolvedValue(undefined)
})

describe('text model download worker', () => {
  it('should forward persisted download progress without creating an inference executor', async () => {
    runtimeMocks.download.mockImplementation(
      async (options: {onProgress: (value: TextGenerationProgress) => void}) => {
        options.onProgress(PROGRESS)
      },
    )
    const worker = await loadWorker()
    worker.dispatch({modelId: 'gemma-4-e2b', type: 'prepare'})
    await waitForResponse(worker, 'ready')
    expect(runtimeMocks.download).toHaveBeenCalledWith({
      modelId: 'gemma-4-e2b',
      onProgress: expect.any(Function),
      runtime: {
        isAssetBundled: expect.any(Function),
        onStorageError: expect.any(Function),
        resumable: {
          deletePartial: expect.any(Function),
          fetch: expect.any(Function),
        },
        storage: {
          delete: expect.any(Function),
          get: expect.any(Function),
          set: expect.any(Function),
        },
      },
    })
    expect(runtimeMocks.create).not.toHaveBeenCalled()
    expect(worker.postMessage.mock.calls.map(([response]) => response)).toEqual([
      {...PROGRESS, type: 'loading'},
      {type: 'ready'},
    ])
  })

  it('should report readiness only after all assets are persisted', async () => {
    let complete: (() => void) | undefined
    runtimeMocks.download.mockReturnValue(
      new Promise<void>((resolve) => {
        complete = resolve
      }),
    )
    const worker = await loadWorker()
    worker.dispatch({modelId: 'lfm-2.6b-qad', type: 'prepare'})
    expect(worker.postMessage).not.toHaveBeenCalled()
    complete?.()
    await waitForResponse(worker, 'ready')
  })

  it('should download each requested model without retaining model sessions', async () => {
    const worker = await loadWorker()
    worker.dispatch({modelId: 'qwen-4b', type: 'prepare'})
    await waitForResponse(worker, 'ready')
    worker.dispatch({modelId: 'gemma-4-e2b', type: 'prepare'})
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2))
    expect(runtimeMocks.download).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({modelId: 'qwen-4b'}),
    )
    expect(runtimeMocks.download).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({modelId: 'gemma-4-e2b'}),
    )
    expect(runtimeMocks.create).not.toHaveBeenCalled()
  })

  it.each([
    {error: new Error('저장 공간 부족'), message: '저장 공간 부족'},
    {error: new Error(), message: '모델 파일을 내려받지 못했어요.'},
    {error: 'unknown failure', message: '모델 파일을 내려받지 못했어요.'},
  ])('should report preparation failures as $message', async ({error, message}) => {
    runtimeMocks.download.mockRejectedValue(error)
    const worker = await loadWorker()

    worker.dispatch({modelId: 'qwen-4b', type: 'prepare'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        message,
        restartRequired: false,
        type: 'error',
      })
    })
  })
})
