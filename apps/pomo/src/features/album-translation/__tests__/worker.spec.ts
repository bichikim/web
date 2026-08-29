import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {AlbumTranslationWorkerRequest, AlbumTranslationWorkerResponse} from '../messages'

interface MockGenerateOptions {
  readonly streamer: {readonly emit: (text: string) => void}
}

interface MockStreamerOptions {
  readonly callback_function: (text: string) => void
}

type WorkerMessageListener = (event: MessageEvent<AlbumTranslationWorkerRequest>) => void

const transformers = vi.hoisted(() => ({
  gemmaModelFromPretrained: vi.fn(),
  generate: vi.fn(),
  processorFromPretrained: vi.fn(),
}))

vi.mock('@huggingface/transformers', () => ({
  AutoProcessor: {from_pretrained: transformers.processorFromPretrained},
  env: {},
  Gemma4ForCausalLM: {from_pretrained: transformers.gemmaModelFromPretrained},
  Qwen3_5ForCausalLM: {from_pretrained: vi.fn()},
  TextStreamer: class {
    readonly emit: (text: string) => void

    constructor(_tokenizer: unknown, options: MockStreamerOptions) {
      this.emit = options.callback_function
    }
  },
}))

const createProcessor = () => {
  const tokenizer = {
    all_special_ids: [0],
    decode: () => '',
    get_vocab: () => new Map(),
  }

  return Object.assign(
    vi.fn(async () => ({input_ids: {dims: [1]}})),
    {
      apply_chat_template: vi.fn(() => 'translation prompt'),
      tokenizer,
    },
  )
}

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: AlbumTranslationWorkerResponse) => void>()

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
    dispatch: (request: AlbumTranslationWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('앨범 번역 Worker 메시지 리스너가 등록되지 않았습니다.')
      }

      messageListener({data: request} as MessageEvent<AlbumTranslationWorkerRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()

  transformers.processorFromPretrained.mockResolvedValue(createProcessor())
  transformers.gemmaModelFromPretrained.mockResolvedValue({generate: transformers.generate})
  transformers.generate.mockImplementation(async (options: MockGenerateOptions) => {
    options.streamer.emit(
      '{"en":{"title":"Night","description":"Rest"},' +
        '"ja":{"title":"夜","description":"休息"},' +
        '"zh-Hans":{"title":"夜晚","description":"休息"}}',
    )
  })
})

describe('album translation worker', () => {
  it('should translate with the existing Gemma 4 model and return structured locales', async () => {
    const worker = await loadWorker()

    worker.dispatch({description: '쉬어가는 시간', title: '밤', type: 'translate'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        translations: {
          en: {description: 'Rest', title: 'Night'},
          ja: {description: '休息', title: '夜'},
          'zh-Hans': {description: '休息', title: '夜晚'},
        },
        type: 'complete',
      })
    })
    expect(transformers.gemmaModelFromPretrained).toHaveBeenCalledWith(
      'onnx-community/gemma-4-E2B-it-ONNX',
      expect.objectContaining({device: 'webgpu'}),
    )
  })

  it('should reuse the loaded runtime and report model download progress', async () => {
    transformers.gemmaModelFromPretrained.mockImplementation(
      async (
        _repositoryId: string,
        options: {
          readonly progress_callback: (progress: {
            readonly files: Readonly<
              Record<string, {readonly loaded: number; readonly total: number}>
            >
            readonly loaded: number
            readonly status: 'progress_total'
            readonly total: number
          }) => void
        },
      ) => {
        options.progress_callback({
          files: {'model.onnx': {loaded: 25, total: 100}},
          loaded: 25,
          status: 'progress_total',
          total: 100,
        })
        return {generate: transformers.generate}
      },
    )
    const worker = await loadWorker()
    const request = {description: '쉬어가는 시간', title: '밤', type: 'translate'} as const

    worker.dispatch(request)
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({type: 'complete'}),
      ),
    )
    worker.dispatch(request)
    await vi.waitFor(() => {
      expect(
        worker.postMessage.mock.calls.filter(([response]) => response.type === 'complete'),
      ).toHaveLength(2)
    })

    expect(worker.postMessage).toHaveBeenCalledWith({
      files: [{fileName: 'model.onnx', loadedBytes: 25, percentage: 25, totalBytes: 100}],
      loadedBytes: 25,
      percentage: 25,
      totalBytes: 100,
      type: 'loading',
    })
    expect(transformers.gemmaModelFromPretrained).toHaveBeenCalledOnce()
  })

  it.each([
    [new Error('generation failed'), 'generation failed'],
    [new Error(''), 'Gemma 4 번역을 실행하지 못했습니다.'],
    ['unknown failure', 'Gemma 4 번역을 실행하지 못했습니다.'],
  ])('should report translation failures without requiring a restart', async (error, message) => {
    transformers.generate.mockRejectedValue(error)
    const worker = await loadWorker()

    worker.dispatch({description: '쉬어가는 시간', title: '밤', type: 'translate'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        message,
        restartRequired: false,
        type: 'error',
      })
    })
  })
})
