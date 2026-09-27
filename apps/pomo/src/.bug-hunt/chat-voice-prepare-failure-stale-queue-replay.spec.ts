/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {failureResult, successResult} from 'src/features/result'
import {type ChatVoiceRuntime, useChatVoice} from '../features/chat-voice'
import {
  type CreateSupertonicAudioPlayerOptions,
  type SupertonicAudioPlayer,
  type SupertonicClient,
} from '../features/supertonic'

const createClient = (): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(),
  generateStream: vi.fn(async function* generateStream() {
    yield {
      ok: true as const,
      value: {
        audio: {
          generationTime: 1,
          index: 0,
          sampleRate: 24_000,
          samples: new Float32Array(1),
          total: 1,
        },
        type: 'chunk' as const,
      },
    }
    yield {
      ok: true as const,
      value: {
        audio: {generationTime: 1, sampleRate: 24_000, samples: new Float32Array(1)},
        type: 'complete' as const,
      },
    }
  }),
  initialize: vi.fn(),
})

const createRuntime = (client: SupertonicClient): ChatVoiceRuntime => ({
  createAudioPlayer: (_options: CreateSupertonicAudioPlayerOptions): SupertonicAudioPlayer => ({
    dispose: vi.fn(),
    enqueue: vi.fn(),
    finish: vi.fn(),
  }),
  createClient: () => client,
})

describe('chat voice prepare failure stale queue replay', () => {
  it('should not replay speech queued before a failed prepare on retry', async () => {
    const client = createClient()
    vi.mocked(client.initialize)
      .mockResolvedValueOnce(
        failureResult({
          code: 'worker-failed',
          detail: '초기화 실패',
          phase: 'initialize',
          retryable: true,
        }),
      )
      .mockResolvedValueOnce(successResult(undefined))

    const runtime = createRuntime(client)
    const root = createRoot((dispose) => {
      const voice = useChatVoice({runtime})
      return {dispose, voice}
    })

    try {
      root.voice.arm()
      void root.voice.speak('실패 전에 큐에 들어간 문장')
      root.voice.finish()

      await root.voice.prepare()
      expect(root.voice.state()).toMatchObject({modelReady: false, status: 'error'})

      await root.voice.prepare()
      expect(root.voice.state().status).toBe('ready')

      root.voice.arm()
      await root.voice.speak('재시도 후 새 문장')
      await root.voice.finish()

      expect(client.generateStream).toHaveBeenCalledTimes(1)
      expect(client.generateStream).toHaveBeenCalledWith({
        text: '재시도 후 새 문장',
        voice: {id: 'Yuna', kind: 'preset'},
      })
    } finally {
      root.dispose()
    }
  })
})
