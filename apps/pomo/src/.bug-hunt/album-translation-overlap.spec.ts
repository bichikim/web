/** @vitest-environment node */
/**
 * Bug hunt: album-translation worker concurrent translate requests.
 * Distinct from #1662 (chat worker duplicate complete).
 */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {
  AlbumTranslationWorkerRequest,
  AlbumTranslationWorkerResponse,
} from '../features/album-translation/messages'

interface MockGenerateOptions {
  readonly streamer: {readonly emit: (text: string) => void}
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
    constructor(
      _tokenizer: unknown,
      options: {readonly callback_function: (text: string) => void},
    ) {
      this.emit = options.callback_function
    }
    readonly emit: (text: string) => void
  },
}))

const createProcessor = () => {
  const tokenizer = {all_special_ids: [0], decode: () => '', get_vocab: () => new Map()}
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
  await import('../features/album-translation/worker')

  return {
    dispatch: (request: AlbumTranslationWorkerRequest) => {
      messageListener?.({data: request} as MessageEvent<AlbumTranslationWorkerRequest>)
    },
    postMessage,
  }
}

const FIRST_JSON =
  '{"en":{"title":"First","description":"A"},' +
  '"ja":{"title":"一","description":"あ"},' +
  '"zh-Hans":{"title":"一","description":"一"}}'
const SECOND_JSON =
  '{"en":{"title":"Second","description":"B"},' +
  '"ja":{"title":"二","description":"い"},' +
  '"zh-Hans":{"title":"二","description":"二"}}'

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  transformers.processorFromPretrained.mockResolvedValue(createProcessor())
  transformers.gemmaModelFromPretrained.mockResolvedValue({generate: transformers.generate})
})

describe('album translation worker overlap', () => {
  it('should emit only one complete for the latest overlapping translate request', async () => {
    let generateCount = 0
    const firstGenerate = Promise.withResolvers<void>()
    const secondGenerate = Promise.withResolvers<void>()

    transformers.generate.mockImplementation(async (options: MockGenerateOptions) => {
      generateCount += 1
      if (generateCount === 1) {
        await firstGenerate.promise
        options.streamer.emit(FIRST_JSON)
        return
      }
      await secondGenerate.promise
      options.streamer.emit(SECOND_JSON)
    })

    const worker = await loadWorker()
    worker.dispatch({description: '첫', title: '첫', type: 'translate'})
    worker.dispatch({description: '둘', title: '둘', type: 'translate'})

    firstGenerate.resolve()
    await vi.waitFor(() =>
      expect(worker.postMessage.mock.calls.some(([response]) => response.type === 'complete')).toBe(
        true,
      ),
    )
    secondGenerate.resolve()
    await vi.waitFor(() =>
      expect(
        worker.postMessage.mock.calls.filter(([response]) => response.type === 'complete'),
      ).toHaveLength(2),
    )

    const completes = worker.postMessage.mock.calls
      .filter(([response]) => response.type === 'complete')
      .map(([response]) => response)

    expect(completes).toHaveLength(1)
    expect(completes[0]).toMatchObject({
      translations: {en: {title: 'Second', description: 'B'}},
      type: 'complete',
    })
  })
})
