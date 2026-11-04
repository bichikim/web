import {createRoot} from 'solid-js'
import {noop} from 'es-toolkit'
import {vi} from 'vitest'
import {successResult} from 'src/features/result'
import {type ChatVoiceController, type ChatVoiceRuntime, useChatVoice} from '../..'
import type {PViseme} from '../../../lip-sync'
import type {
  CreateSupertonicAudioPlayerOptions,
  SupertonicAudio,
  SupertonicAudioChunk,
  SupertonicAudioPlayer,
  SupertonicClient,
} from '../../../supertonic'

const SAMPLE_RATE = 24_000
const SAMPLE_VALUE = 0.1

interface TestRoot {
  readonly controller: ChatVoiceController
  readonly dispose: () => void
}

interface TestAudioPlayer extends SupertonicAudioPlayer {
  readonly end: () => void
  readonly viseme: (viseme: PViseme) => void
}

export const createAudio = (): SupertonicAudio => ({
  generationTime: 100,
  sampleRate: SAMPLE_RATE,
  samples: Float32Array.of(SAMPLE_VALUE),
})

export const createAudioChunk = (): SupertonicAudioChunk => ({...createAudio(), index: 0, total: 1})

export const createClient = (): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(async () => successResult(createAudio())),
  generateStream: vi.fn(async function* generateStream() {
    yield successResult({audio: createAudioChunk(), type: 'chunk' as const})
    yield successResult({audio: createAudio(), type: 'complete' as const})
  }),
  initialize: vi.fn(async (options) => {
    options.onProgress({fileName: '음성 모델', loadedBytes: 1, totalBytes: 2})
    return successResult(undefined)
  }),
})

const createAudioPlayer = (options: CreateSupertonicAudioPlayerOptions): TestAudioPlayer => ({
  dispose: vi.fn(),
  end: () => options.onPlaybackEnd?.(),
  enqueue: vi.fn(),
  finish: vi.fn(),
  viseme: (viseme) => options.onVisemeChange?.(viseme),
})

interface TestRuntime {
  readonly players: Array<TestAudioPlayer>
  readonly runtime: ChatVoiceRuntime
}

export const createRuntime = (client: SupertonicClient): TestRuntime => {
  const players: Array<TestAudioPlayer> = []
  const runtime: ChatVoiceRuntime = {
    createAudioPlayer: (options) => {
      const player = createAudioPlayer(options)
      players.push(player)
      return player
    },
    createClient: () => client,
  }

  return {players, runtime}
}

export const createTestRoot = (runtime: ChatVoiceRuntime): TestRoot => {
  let disposeRoot: () => void = noop
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useChatVoice({runtime})
  })

  return {controller, dispose: disposeRoot}
}
