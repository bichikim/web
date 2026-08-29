import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const transportMocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  getFailure: vi.fn(() => null),
  request: vi.fn(),
}))

vi.mock('../../worker-rpc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../worker-rpc')>()
  return {
    ...actual,
    createWorkerRpcTransport: vi.fn(() => transportMocks),
  }
})

import {createSpeechRecognizer} from '../client'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('Worker', class {})
  transportMocks.getFailure.mockReturnValue(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it.each(['prepare', 'transcribe'] as const)(
  'should normalize an unknown %s request rejection',
  async (phase) => {
    transportMocks.request.mockRejectedValueOnce(new Error('unexpected transport failure'))
    const recognizer = createSpeechRecognizer({
      modelId: 'whisper-tiny',
      onBackendChange: vi.fn(),
      onProgress: vi.fn(),
      preferredBackend: 'wasm',
    })
    const result =
      phase === 'prepare'
        ? await recognizer.prepare()
        : await recognizer.transcribe({audio: Float32Array.of(0.1), language: 'korean'})

    expect(result).toEqual({
      error: {
        code: 'worker-failed',
        detail: 'Worker 요청을 완료하지 못했습니다.',
        phase,
        retryable: true,
      },
      ok: false,
    })
  },
)
