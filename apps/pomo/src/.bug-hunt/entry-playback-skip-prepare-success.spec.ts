/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PDialogueRepository} from '../features/focus-room-dialogue/repository'
import type {PDialogue} from '../features/focus-room-dialogue/schema'
import {createEntryPlaybackController} from '../features/focus-room-dialogue/entry-playback-controller'

const DIALOGUE: PDialogue = {
  audioKey: 'audio-1',
  createdAt: '2026-08-16T00:00:00.000Z',
  durationMs: 1000,
  id: 'dialogue-1',
  language: 'ko',
  modelId: 'int8',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
  text: '안녕하세요',
  updatedAt: '2026-08-16T00:00:00.000Z',
  version: 1,
  voiceId: 'F1',
}
const AUDIO_BLOB = {
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
} as unknown as Blob

class TestAudio extends EventTarget {
  static readonly instances: TestAudio[] = []
  static playImplementation: () => Promise<void> = () => Promise.resolve()
  currentTime = 0.25
  readonly pause = vi.fn()
  readonly play = vi.fn<() => Promise<void>>(() => TestAudio.playImplementation())

  constructor(readonly src: string) {
    super()
    TestAudio.instances.push(this)
  }
}

const createRepository = () =>
  ({
    getAudio: vi.fn().mockResolvedValue(AUDIO_BLOB),
    getDialogue: vi.fn().mockResolvedValue(DIALOGUE),
  }) as unknown as PDialogueRepository

const flush = async () => {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  TestAudio.instances.length = 0
  TestAudio.playImplementation = () => Promise.resolve()
  vi.stubGlobal('Audio', TestAudio)
  vi.stubGlobal('AudioContext', undefined)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dialogue')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should report prepare as unsuccessful when the listener skips before natural playback end', async () => {
  const controller = createEntryPlaybackController()
  const prepared = controller.prepare(createRepository(), DIALOGUE.id)
  await flush()

  controller.skip()
  await expect(prepared).resolves.toBe(false)
})
