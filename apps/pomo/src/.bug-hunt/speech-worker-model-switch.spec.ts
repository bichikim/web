/** @vitest-environment node */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {SpeechWorkerRequest, SpeechWorkerResponse} from '../features/speech-to-text/messages'

interface MockPipelineOptions {
  readonly device: 'wasm' | 'webgpu'
  readonly progress_callback: (progress: {
    readonly files: Readonly<Record<string, {readonly loaded: number; readonly total: number}>>
    readonly loaded: number
    readonly name: string
    readonly progress: number
    readonly status: 'progress_total'
    readonly total: number
  }) => void
}

type WorkerMessageListener = (event: MessageEvent<SpeechWorkerRequest>) => void

const transformers = vi.hoisted(() => ({pipeline: vi.fn(), transcribe: vi.fn()}))

vi.mock('@huggingface/transformers', () => ({pipeline: transformers.pipeline}))

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: SpeechWorkerResponse) => void>()

  vi.stubGlobal('self', {
    addEventListener: (type: string, listener: WorkerMessageListener) => {
      if (type === 'message') {
        messageListener = listener
      }
    },
    postMessage,
  })
  await import('../features/speech-to-text/worker')

  return {
    dispatch: (request: SpeechWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('음성 인식 Worker 메시지 리스너가 등록되지 않았습니다.')
      }

      messageListener({data: request} as MessageEvent<SpeechWorkerRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  transformers.transcribe.mockResolvedValue({text: ' 안녕하세요 '})
})

describe('speech worker model switch during preparation', () => {
  it('should load the requested model when a different model is prepared while one is in flight', async () => {
    let resolvePipeline: ((transcriber: typeof transformers.transcribe) => void) | undefined
    const loadedRepositoryIds: string[] = []

    transformers.pipeline.mockImplementation(
      async (_task: string, repositoryId: string, _options: MockPipelineOptions) =>
        new Promise((resolve) => {
          loadedRepositoryIds.push(repositoryId)
          resolvePipeline = resolve
        }),
    )

    const worker = await loadWorker()
    worker.dispatch({
      modelId: 'whisper-base',
      preferredBackend: 'wasm',
      requestId: 1,
      type: 'prepare',
    })
    worker.dispatch({
      modelId: 'moonshine-tiny-ko',
      preferredBackend: 'wasm',
      requestId: 2,
      type: 'prepare',
    })

    await vi.waitFor(() => expect(transformers.pipeline).toHaveBeenCalledOnce())
    resolvePipeline?.(transformers.transcribe)

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 1, type: 'ready'}),
      )
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 2, type: 'ready'}),
      )
    })

    expect(loadedRepositoryIds).toEqual([
      'onnx-community/whisper-base',
      'onnx-community/moonshine-tiny-ko-ONNX',
    ])
  })
})
