import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {SpeechWorkerRequest, SpeechWorkerResponse} from '../messages'

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
  await import('../worker')

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
  transformers.pipeline.mockResolvedValue(transformers.transcribe)
})

describe('speech recognition worker', () => {
  it('should fall back to WASM and preserve the preparation request id', async () => {
    transformers.pipeline.mockImplementation(
      async (_task: string, _model: string, options: MockPipelineOptions) => {
        if (options.device === 'webgpu') {
          throw new Error('WebGPU 초기화 실패')
        }

        options.progress_callback({
          files: {'model.onnx': {loaded: 55, total: 100}},
          loaded: 55,
          name: 'whisper',
          progress: 55,
          status: 'progress_total',
          total: 100,
        })
        return transformers.transcribe
      },
    )
    const worker = await loadWorker()
    worker.dispatch({
      modelId: 'whisper-base',
      preferredBackend: 'webgpu',
      requestId: 7,
      type: 'prepare',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        backend: 'wasm',
        requestId: 7,
        type: 'ready',
      })
    })
    expect(worker.postMessage).toHaveBeenCalledWith({backend: 'wasm', type: 'backend-changed'})
    expect(worker.postMessage).toHaveBeenCalledWith({progress: 55, type: 'loading'})
    expect(transformers.pipeline).toHaveBeenLastCalledWith(
      'automatic-speech-recognition',
      'onnx-community/whisper-base',
      expect.objectContaining({device: 'wasm'}),
    )
  })

  it('should transcribe the requested language and return the matching request id', async () => {
    const worker = await loadWorker()
    const audio = Float32Array.of(0.1, 0.2)
    worker.dispatch({
      audio,
      language: 'korean',
      modelId: 'whisper-tiny',
      preferredBackend: 'wasm',
      requestId: 12,
      type: 'transcribe',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        backend: 'wasm',
        requestId: 12,
        text: '안녕하세요',
        type: 'complete',
      })
    })
    expect(transformers.transcribe).toHaveBeenCalledWith(audio, {
      language: 'korean',
      task: 'transcribe',
    })
  })

  it('should return a structured model failure for the originating request', async () => {
    transformers.pipeline.mockRejectedValue(new Error('모델 다운로드 실패'))
    const worker = await loadWorker()
    worker.dispatch({
      modelId: 'whisper-tiny',
      preferredBackend: 'wasm',
      requestId: 21,
      type: 'prepare',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        error: {
          code: 'model-failed',
          detail: '모델 다운로드 실패',
          phase: 'prepare',
          retryable: true,
        },
        requestId: 21,
        type: 'error',
      })
    })
  })

  it('should run a Korean Moonshine model without Whisper generation options', async () => {
    const worker = await loadWorker()
    const audio = Float32Array.of(0.1, 0.2)
    worker.dispatch({
      audio,
      language: 'korean',
      modelId: 'moonshine-tiny-ko',
      preferredBackend: 'wasm',
      requestId: 31,
      type: 'transcribe',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        backend: 'wasm',
        requestId: 31,
        text: '안녕하세요',
        type: 'complete',
      })
    })
    expect(transformers.pipeline).toHaveBeenCalledWith(
      'automatic-speech-recognition',
      'onnx-community/moonshine-tiny-ko-ONNX',
      expect.objectContaining({device: 'wasm'}),
    )
    expect(transformers.transcribe).toHaveBeenCalledWith(audio)
  })
})
