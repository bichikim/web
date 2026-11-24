import {vi} from 'vitest'

import type {PDialogueRepository} from '../../repository'
import type {PDialogue} from '../../schema'

const AUDIO_BYTES = 8
const DURATION_MS = 1000
const PLAYBACK_TIME = 0.25

interface PlaybackAudio extends EventTarget {
  currentTime: number
  ended: boolean
  readonly pause: () => void
  readonly play: () => Promise<void>
  readonly src: string
}

interface PlaybackConstructor {
  new (src: string): PlaybackAudio
  readonly instances: PlaybackAudio[]
  playImplementation: () => Promise<void>
}

interface PlaybackRuntime {
  readonly DIALOGUE: PDialogue
  readonly TestAudio: PlaybackConstructor
  readonly createRepository: (
    dialogue?: PDialogue | null,
    audio?: Blob | null,
  ) => PDialogueRepository
  readonly latestAudio: () => PlaybackAudio
}

export const createPlaybackRuntime = (): PlaybackRuntime => {
  const DIALOGUE: PDialogue = {
    audioKey: 'audio-1',
    createdAt: '2026-08-16T00:00:00.000Z',
    durationMs: DURATION_MS,
    id: 'dialogue-1',
    language: 'ko',
    modelId: 'int8',
    segments: [{durationMs: DURATION_MS, index: 0, startMs: 0, text: '안녕하세요'}],
    text: '안녕하세요',
    updatedAt: '2026-08-16T00:00:00.000Z',
    version: 1,
    voiceId: 'F1',
  }
  const AUDIO_BLOB = {
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(AUDIO_BYTES)),
  } as unknown as Blob

  class TestAudio extends EventTarget {
    static readonly instances: TestAudio[] = []
    static playImplementation: () => Promise<void> = () => Promise.resolve()
    currentTime = PLAYBACK_TIME
    ended = false
    readonly pause = vi.fn()
    readonly play = vi.fn<() => Promise<void>>(() => TestAudio.playImplementation())

    constructor(readonly src: string) {
      super()
      TestAudio.instances.push(this)
    }
  }

  const createRepository = (
    dialogue: PDialogue | null = DIALOGUE,
    audio: Blob | null = AUDIO_BLOB,
  ): PDialogueRepository =>
    ({
      getAudio: vi.fn().mockResolvedValue(audio),
      getDialogue: vi.fn().mockResolvedValue(dialogue),
    }) as unknown as PDialogueRepository

  const latestAudio = (): PlaybackAudio => {
    const audio = TestAudio.instances.at(-1)

    if (audio === undefined) {
      throw new Error('Expected an audio instance')
    }

    return audio
  }

  return {createRepository, DIALOGUE, latestAudio, TestAudio}
}

export const flush = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
