/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createPVisemeDriver, createPVisemeTrack, createPWaveEnvelope} from '../../lip-sync'
import {createPBrowserAudioVisemeAnalyzer} from '../../lip-sync/browser-audio-viseme'
import {createEntryPlaybackController} from '../entry-playback-controller'
import type {PDialogueRepository} from '../repository'
import {focusRoomDialogueSchema, type PDialogue} from '../schema'
import {getDialogueVisemeAtTime} from '../timeline'

vi.mock('../../lip-sync', async () => {
  const actual = await vi.importActual<typeof import('../../lip-sync')>('../../lip-sync')
  return {
    ...actual,
    createPVisemeDriver: vi.fn(),
    createPVisemeTrack: vi.fn(actual.createPVisemeTrack),
    createPWaveEnvelope: vi.fn(),
  }
})
vi.mock('../../lip-sync/browser-audio-viseme', () => ({
  createPBrowserAudioVisemeAnalyzer: vi.fn(),
}))
vi.mock('../timeline', async () => {
  const actual = await vi.importActual<typeof import('../timeline')>('../timeline')
  return {...actual, getDialogueVisemeAtTime: vi.fn(actual.getDialogueVisemeAtTime)}
})

const AUDIO = {arrayBuffer: async () => new ArrayBuffer(0)} as Blob
const frames: FrameRequestCallback[] = []
const update = vi.fn()
const controllers: ReturnType<typeof createEntryPlaybackController>[] = []

class TestAudio extends EventTarget {
  static readonly instances: TestAudio[] = []
  currentTime = 0
  ended = false
  readonly pause = vi.fn()
  readonly play = vi.fn().mockResolvedValue(undefined)

  constructor(readonly src: string) {
    super()
    TestAudio.instances.push(this)
  }
}

const createDialogue = (text = '마마 아 오'): PDialogue => {
  const dialogue = focusRoomDialogueSchema.parse({
    audioKey: 'audio',
    createdAt: '2026-08-16T00:00:00.000Z',
    durationMs: 2200,
    id: 'dialogue',
    modelId: 'int8',
    segments: [
      {durationMs: 1000, index: 0, startMs: 0, text},
      {
        durationMs: 200,
        index: 1,
        startMs: 1200,
        text: '오',
        visemes: [{endMs: 200, startMs: 0, viseme: 'wide'}],
      },
      {durationMs: 200, index: 2, startMs: 1600, text: '오', visemes: []},
      {durationMs: 0, index: 3, startMs: 2000, text: '아'},
    ],
    text,
    updatedAt: '2026-08-16T00:00:00.000Z',
    version: 1,
    voiceId: 'F1',
  })
  dialogue.segments.forEach(Object.freeze)
  return Object.freeze(dialogue)
}
const createRepository = (dialogue: PDialogue | null = createDialogue()) =>
  ({
    getAudio: vi.fn().mockResolvedValue(AUDIO),
    getDialogue: vi.fn().mockResolvedValue(dialogue),
  }) as unknown as PDialogueRepository
const createController = () => {
  const controller = createEntryPlaybackController()
  controllers.push(controller)
  return controller
}
const latestAudio = () => TestAudio.instances.at(-1)!
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  frames.length = 0
  TestAudio.instances.length = 0
  vi.mocked(createPWaveEnvelope).mockReturnValue(null)
  vi.mocked(createPVisemeDriver).mockReturnValue({reset: vi.fn(), update})
  update.mockImplementation((frame) => frame.viseme)
  vi.mocked(createPBrowserAudioVisemeAnalyzer).mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    getFrame: vi.fn().mockReturnValue(null),
  })
  vi.stubGlobal('Audio', TestAudio)
  vi.stubGlobal('AudioContext', undefined)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dialogue')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined)
})

afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.dispose())
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createEntryPlaybackController legacy visemes', () => {
  it('should prepare missing cues once and preserve real frame output, stored identity and empty cues', async () => {
    const dialogue = createDialogue()
    const times = [0, 50, 700, 999, 1000, 1199, 1200, 1350, 1400, 1600, 1700, 2000, 700, 0]
    const expected = times.map((time) => getDialogueVisemeAtTime(dialogue.segments, time))
    vi.mocked(createPVisemeTrack).mockClear()
    vi.mocked(getDialogueVisemeAtTime).mockClear()
    const controller = createController()
    const playback = controller.prepare(createRepository(dialogue), dialogue.id)
    await flush()
    await flush()

    expect(createPVisemeTrack).toHaveBeenCalledTimes(2)
    const prepared = vi.mocked(getDialogueVisemeAtTime).mock.calls[0]![0]
    expect(prepared).not.toBe(dialogue.segments)
    expect(prepared[1]).toBe(dialogue.segments[1])
    expect(prepared[2]).toBe(dialogue.segments[2])
    expect(prepared[1].visemes).toBe(dialogue.segments[1].visemes)
    expect(prepared[2].visemes).toBe(dialogue.segments[2].visemes)
    expect(dialogue.segments[0]).not.toHaveProperty('visemes')
    expect(dialogue.segments[3]).not.toHaveProperty('visemes')

    for (const [index, time] of times.entries()) {
      latestAudio().currentTime = time / 1000
      frames.at(-1)!(0)
      expect(update).toHaveBeenLastCalledWith(expect.objectContaining({viseme: expected[index]}))
      expect(getDialogueVisemeAtTime).toHaveBeenLastCalledWith(prepared, time)
    }
    expect(createPVisemeTrack).toHaveBeenCalledTimes(2)
    controller.cancel()
    await expect(playback).resolves.toBe(false)
  })

  it('should prepare a fresh snapshot when the same dialogue is replayed with updated text', async () => {
    const first = createDialogue('아')
    const second = createDialogue('오')
    const repository = createRepository(first)
    vi.mocked(repository.getDialogue).mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const controller = createController()
    const firstPlayback = controller.prepare(repository, first.id)
    await flush()
    await flush()
    expect(controller.activeViseme()).toBe('open')
    latestAudio().dispatchEvent(new Event('ended'))
    await expect(firstPlayback).resolves.toBe(true)

    const secondPlayback = controller.prepare(repository, second.id)
    await flush()
    await flush()
    expect(controller.activeViseme()).toBe('round')
    expect(createPVisemeTrack).toHaveBeenCalledTimes(4)
    controller.cancel()
    await expect(secondPlayback).resolves.toBe(false)
  })

  it('should reuse every segment when all stored cue arrays are present', async () => {
    const stored = createDialogue()
    const dialogue = {...stored, segments: stored.segments.slice(1, 3)}
    const controller = createController()
    const playback = controller.prepare(createRepository(dialogue), dialogue.id)
    await flush()
    await flush()
    const prepared = vi.mocked(getDialogueVisemeAtTime).mock.calls[0]![0]
    expect(prepared[0]).toBe(dialogue.segments[0])
    expect(prepared[1]).toBe(dialogue.segments[1])
    expect(createPVisemeTrack).not.toHaveBeenCalled()
    controller.cancel()
    await expect(playback).resolves.toBe(false)
  })

  it('should retain playback fallback when the envelope read fails', async () => {
    const repository = createRepository()
    vi.mocked(repository.getAudio).mockResolvedValue({
      arrayBuffer: vi.fn().mockRejectedValue(new Error('unreadable envelope')),
    } as unknown as Blob)
    const controller = createController()
    const playback = controller.prepare(repository, 'dialogue')
    await flush()
    await flush()
    expect(latestAudio().play).toHaveBeenCalledOnce()
    expect(controller.activeViseme()).toBe('closed')
    expect(createPVisemeTrack).toHaveBeenCalledTimes(2)
    controller.cancel()
    await expect(playback).resolves.toBe(false)
  })

  it.each(['getDialogue', 'getAudio'] as const)(
    'should propagate the original %s failure before preparing cues',
    async (method) => {
      const repository = createRepository()
      const error = new Error(method)
      vi.mocked(repository[method]).mockRejectedValue(error)
      await expect(createController().prepare(repository, 'dialogue')).rejects.toBe(error)
      expect(createPVisemeTrack).not.toHaveBeenCalled()
      expect(TestAudio.instances).toHaveLength(0)
    },
  )

  it.each(['cancel', 'dispose'] as const)(
    'should avoid cue preparation when %s invalidates the pending envelope read',
    async (action) => {
      const pending = Promise.withResolvers<ArrayBuffer>()
      const audio = {arrayBuffer: () => pending.promise} as Blob
      const repository = createRepository()
      vi.mocked(repository.getAudio).mockResolvedValue(audio)
      const controller = createController()
      const playback = controller.prepare(repository, 'dialogue')
      await flush()
      expect(repository.getAudio).toHaveBeenCalledOnce()
      expect(createPVisemeTrack).not.toHaveBeenCalled()
      controller[action]()
      pending.resolve(new ArrayBuffer(0))
      await expect(playback).resolves.toBe(false)
      expect(createPVisemeTrack).not.toHaveBeenCalled()
      expect(TestAudio.instances).toHaveLength(0)
    },
  )

  it('should ignore replaced preparation and derive only the replacement dialogue', async () => {
    const pending = Promise.withResolvers<ArrayBuffer>()
    const repository = createRepository(createDialogue('아'))
    vi.mocked(repository.getAudio).mockResolvedValue({arrayBuffer: () => pending.promise} as Blob)
    const controller = createController()
    const first = controller.prepare(repository, 'old')
    await flush()
    controller.cancel()
    const second = controller.prepare(createRepository(createDialogue('오')), 'new')
    await flush()
    pending.resolve(new ArrayBuffer(0))
    await expect(first).resolves.toBe(false)
    await flush()
    await flush()
    expect(createPVisemeTrack).toHaveBeenCalledTimes(2)
    expect(controller.activeViseme()).toBe('round')
    expect(TestAudio.instances).toHaveLength(1)
    controller.cancel()
    await expect(second).resolves.toBe(false)
  })

  it.each(['dialogue', 'audio'] as const)(
    'should not derive cues when the stored %s is missing',
    async (missing) => {
      const repository = createRepository(missing === 'dialogue' ? null : createDialogue())
      if (missing === 'audio') {
        vi.mocked(repository.getAudio).mockResolvedValue(null)
      }
      await expect(createController().prepare(repository, 'dialogue')).resolves.toBe(false)
      expect(createPVisemeTrack).not.toHaveBeenCalled()
      expect(TestAudio.instances).toHaveLength(0)
    },
  )
})
