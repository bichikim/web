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
  prepare: vi.fn(),
}))

vi.mock('../../text-generation/transformers-runtime', () => ({
  createTransformersRuntime: runtimeMocks.create,
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
  runtimeMocks.create.mockReturnValue({prepare: runtimeMocks.prepare})
  runtimeMocks.prepare.mockResolvedValue(undefined)
})

describe('text model download worker', () => {
  it('should forward progress and prepare the requested model before reporting readiness', async () => {
    runtimeMocks.create.mockImplementation(
      (options: {onProgress: (value: TextGenerationProgress) => void}) => {
        options.onProgress(PROGRESS)
        return {prepare: runtimeMocks.prepare}
      },
    )
    const worker = await loadWorker()

    worker.dispatch({modelId: 'qwen-4b', type: 'prepare'})
    await waitForResponse(worker, 'ready')

    expect(worker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(runtimeMocks.create).toHaveBeenCalledOnce()
    expect(runtimeMocks.prepare).toHaveBeenCalledWith('qwen-4b')
    expect(worker.postMessage.mock.calls.map(([response]) => response)).toEqual([
      {...PROGRESS, type: 'loading'},
      {type: 'ready'},
    ])
  })

  it('should bind sequential model requests to their requested model', async () => {
    const prepareFirst = vi.fn().mockResolvedValue(undefined)
    const prepareSecond = vi.fn().mockResolvedValue(undefined)
    runtimeMocks.create
      .mockReturnValueOnce({prepare: prepareFirst})
      .mockReturnValueOnce({prepare: prepareSecond})
    const worker = await loadWorker()

    worker.dispatch({modelId: 'qwen-4b', type: 'prepare'})
    await waitForResponse(worker, 'ready')
    worker.dispatch({modelId: 'gemma-4-e2b', type: 'prepare'})
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2))

    expect(prepareFirst).toHaveBeenCalledWith('qwen-4b')
    expect(prepareSecond).toHaveBeenCalledWith('gemma-4-e2b')
    expect(runtimeMocks.create).toHaveBeenCalledTimes(2)
    expect(worker.postMessage).toHaveBeenNthCalledWith(1, {type: 'ready'})
    expect(worker.postMessage).toHaveBeenNthCalledWith(2, {type: 'ready'})
  })

  it.each([
    {error: new Error('저장 공간 부족'), message: '저장 공간 부족'},
    {error: new Error(), message: '모델 파일을 내려받지 못했어요.'},
    {error: 'unknown failure', message: '모델 파일을 내려받지 못했어요.'},
  ])('should report preparation failures as $message', async ({error, message}) => {
    runtimeMocks.prepare.mockRejectedValue(error)
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
