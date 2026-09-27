/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {failureResult} from 'src/features/result'
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
  initialize: vi.fn(async () =>
    failureResult({
      code: 'worker-failed',
      detail: '초기화 실패',
      phase: 'initialize',
      retryable: true,
    }),
  ),
})

const createRuntime = (client: SupertonicClient): ChatVoiceRuntime => ({
  createAudioPlayer: (_options: CreateSupertonicAudioPlayerOptions): SupertonicAudioPlayer => ({
    dispose: vi.fn(),
    enqueue: vi.fn(),
    finish: vi.fn(),
  }),
  createClient: () => client,
})

describe('chat voice prepare failure strands queued speech', () => {
  it('should settle speak() and finish() when model preparation fails', async () => {
    const client = createClient()
    const runtime = createRuntime(client)
    const root = createRoot((dispose) => {
      const voice = useChatVoice({runtime})
      return {dispose, voice}
    })

    try {
      root.voice.arm()
      const speech = root.voice.speak('준비 실패 전에 큐에 들어간 문장')
      const playback = root.voice.finish()

      await root.voice.prepare()

      expect(root.voice.state()).toMatchObject({modelReady: false, status: 'error'})

      await expect(
        Promise.race([
          speech,
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('speak() never settled')), 200)
          }),
        ]),
      ).resolves.toBeUndefined()

      await expect(
        Promise.race([
          playback,
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('finish() never settled')), 200)
          }),
        ]),
      ).resolves.toBeUndefined()
    } finally {
      root.dispose()
    }
  })
})
