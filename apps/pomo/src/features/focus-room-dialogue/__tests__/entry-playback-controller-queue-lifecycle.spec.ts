/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {PDialogueRepository} from '../repository'
import type {PDialogue} from '../schema'
import {createEntryPlaybackController} from '../entry-playback-controller'

type FileReaderListener = () => void

const playbackMocks = vi.hoisted(() => ({
  analyzerConnect: vi.fn(),
  analyzerDisconnect: vi.fn(),
  analyzerDispose: vi.fn(),
  analyzerFrame: vi.fn(),
  createEnvelope: vi.fn(),
  driverReset: vi.fn(),
  driverUpdate: vi.fn(),
  envelopeLevel: vi.fn(),
  position: vi.fn(),
  viseme: vi.fn(),
}))
const animationFrames: FrameRequestCallback[] = []

vi.mock('../../lip-sync', () => ({
  createPVisemeDriver: () => ({
    reset: playbackMocks.driverReset,
    update: playbackMocks.driverUpdate,
  }),
  createPWaveEnvelope: playbackMocks.createEnvelope,
  getPAudioEnvelopeLevel: playbackMocks.envelopeLevel,
}))
vi.mock('../../lip-sync/browser-audio-viseme', () => ({
  createPBrowserAudioVisemeAnalyzer: () => ({
    connect: playbackMocks.analyzerConnect,
    disconnect: playbackMocks.analyzerDisconnect,
    dispose: playbackMocks.analyzerDispose,
    getFrame: playbackMocks.analyzerFrame,
  }),
}))
vi.mock('../timeline', () => ({
  getDialoguePositionAtTime: playbackMocks.position,
  getDialogueVisemeAtTime: playbackMocks.viseme,
}))

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
  ended = false
  readonly pause = vi.fn()
  readonly play = vi.fn<() => Promise<void>>(() => TestAudio.playImplementation())

  constructor(readonly src: string) {
    super()
    TestAudio.instances.push(this)
  }
}

const createRepository = (dialogue: PDialogue | null = DIALOGUE, audio: Blob | null = AUDIO_BLOB) =>
  ({
    getAudio: vi.fn().mockResolvedValue(audio),
    getDialogue: vi.fn().mockResolvedValue(dialogue),
  }) as unknown as PDialogueRepository

const latestAudio = () => {
  const audio = TestAudio.instances.at(-1)

  if (audio === undefined) {
    throw new Error('Expected an audio instance')
  }

  return audio
}

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
  TestAudio.instances.length = 0
  animationFrames.length = 0
  TestAudio.playImplementation = () => Promise.resolve()
  vi.clearAllMocks()
  playbackMocks.createEnvelope.mockResolvedValue({samples: [0.5]})
  playbackMocks.driverUpdate.mockReturnValue('open')
  playbackMocks.envelopeLevel.mockReturnValue(0.5)
  playbackMocks.position.mockReturnValue({position: 0, text: '안녕하세요'})
  playbackMocks.viseme.mockReturnValue('wide')
  playbackMocks.analyzerFrame.mockReturnValue(null)
  playbackMocks.analyzerConnect.mockResolvedValue(undefined)
  vi.stubGlobal('Audio', TestAudio)
  vi.stubGlobal('AudioContext', undefined)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dialogue')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    animationFrames.push(callback)
    return 17
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createEntryPlaybackController', () => {
  it('should play multiple sequence items and schedule queued dialogue IDs', async () => {
    const started: string[] = []
    const repository = createRepository()
    const controller = createEntryPlaybackController()
    const playback = controller.playSequence(repository, {
      dialogueIds: ['first', 'second'],
      onDialogueStart: (id) => {
        started.push(id)
      },
      onSequenceStop: vi.fn(),
    })
    const queued = controller.prepare(repository, 'third')
    expect(controller.isDialogueScheduled('first')).toBe(true)
    expect(controller.isDialogueScheduled('second')).toBe(true)
    expect(controller.isDialogueScheduled('third')).toBe(true)
    expect(controller.isDialogueScheduled('absent')).toBe(false)

    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await flush()
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await playback
    await flush()
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await queued
    expect(started).toEqual(['first', 'second'])
  })

  it('should cancel loading and a pending play without reviving stale playback', async () => {
    let resolveDialogue: ((dialogue: PDialogue | null) => void) | undefined
    const repository = createRepository()
    vi.mocked(repository.getDialogue).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDialogue = resolve
        }),
    )
    const loadingController = createEntryPlaybackController()
    const loading = loadingController.prepare(repository, DIALOGUE.id)
    loadingController.cancel()
    resolveDialogue?.(DIALOGUE)
    await loading
    await flush()
    expect(loadingController.isPlaying()).toBe(false)

    let resolvePlay: (() => void) | undefined
    TestAudio.playImplementation = () =>
      new Promise((resolve) => {
        resolvePlay = resolve
      })
    const playingController = createEntryPlaybackController()
    const playing = playingController.prepare(createRepository(), DIALOGUE.id)
    await flush()
    playingController.cancel()
    resolvePlay?.()
    await playing
    await flush()
    expect(playingController.isPlaying()).toBe(false)
  })

  it('should avoid double settlement when stop races an ended event', async () => {
    const controller = createEntryPlaybackController()
    const stop = vi.fn()
    const playback = controller.playSequence(createRepository(), {
      dialogueIds: [DIALOGUE.id],
      onDialogueStart: vi.fn(),
      onSequenceStop: stop,
    })
    await flush()
    const audio = latestAudio()
    audio.dispatchEvent(new Event('ended'))
    controller.stop()
    await playback
    expect(stop).toHaveBeenCalledOnce()
  })

  it('should ignore skip and retry after disposal', () => {
    const controller = createEntryPlaybackController()
    controller.skip()
    controller.retry()
    controller.dispose()
    controller.skip()
    controller.retry()
  })

  it('should run the delayed viseme reset timer after a completed queue', async () => {
    const controller = createEntryPlaybackController()
    const playback = controller.prepare(createRepository(), DIALOGUE.id)
    await flush()
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await playback
    await flush()
    vi.runAllTimers()
    expect(controller.activeViseme()).toBe('closed')
  })

  it('should wait for context suspension before the next sequence item', async () => {
    const source = {connect: vi.fn(), disconnect: vi.fn()}
    const context = {
      close: vi.fn().mockResolvedValue(undefined),
      createMediaElementSource: vi.fn(() => source),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      state: 'running',
      suspend: vi.fn().mockResolvedValue(undefined),
    }
    vi.stubGlobal(
      'AudioContext',
      class {
        close = context.close
        createMediaElementSource = context.createMediaElementSource
        destination = context.destination
        resume = context.resume
        state = context.state
        suspend = context.suspend
      },
    )
    const controller = createEntryPlaybackController()
    const playback = controller.playSequence(createRepository(), {
      dialogueIds: ['first', 'second'],
      onDialogueStart: vi.fn(),
      onSequenceStop: vi.fn(),
    })
    await flush()
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await flush()
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await playback
    expect(context.suspend).toHaveBeenCalled()
    expect(context.resume).toHaveBeenCalledTimes(2)
  })

  it('should cancel after envelope loading and while the start callback is pending', async () => {
    let resolveEnvelope: ((value: object) => void) | undefined
    playbackMocks.createEnvelope.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveEnvelope = resolve
        }),
    )
    const loadingController = createEntryPlaybackController()
    const loading = loadingController.prepare(createRepository(), DIALOGUE.id)
    await flush()
    loadingController.cancel()
    resolveEnvelope?.({samples: []})
    await loading

    let resolveStart: (() => void) | undefined
    const startController = createEntryPlaybackController()
    const starting = startController.playSequence(createRepository(), {
      dialogueIds: [DIALOGUE.id],
      onDialogueStart: () =>
        new Promise((resolve) => {
          resolveStart = resolve
        }),
      onSequenceStop: vi.fn(),
    })
    await flush()
    await flush()
    startController.cancel()
    resolveStart?.()
    await starting
  })

  it('should ignore a rejected play after cancellation', async () => {
    let rejectPlay: ((error: unknown) => void) | undefined
    TestAudio.playImplementation = () =>
      new Promise((_resolve, reject) => {
        rejectPlay = reject
      })
    const controller = createEntryPlaybackController()
    const playback = controller.prepare(createRepository(), DIALOGUE.id)
    await flush()
    await flush()
    controller.cancel()
    rejectPlay?.(new Error('stale failure'))
    await playback
    await flush()
  })

  it('should stop a prepared request and avoid closing an already closed context', async () => {
    const context = {
      close: vi.fn(),
      createMediaElementSource: vi.fn(() => ({connect: vi.fn(), disconnect: vi.fn()})),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      state: 'closed',
      suspend: vi.fn().mockResolvedValue(undefined),
    }
    vi.stubGlobal(
      'AudioContext',
      class {
        close = context.close
        createMediaElementSource = context.createMediaElementSource
        destination = context.destination
        resume = context.resume
        state = context.state
        suspend = context.suspend
      },
    )
    const controller = createEntryPlaybackController()
    const playback = controller.prepare(createRepository(), DIALOGUE.id)
    await flush()
    controller.stop()
    await playback
    controller.dispose()
    expect(context.close).not.toHaveBeenCalled()
  })

  it('should stop draining when disposed with another request queued', async () => {
    const controller = createEntryPlaybackController()
    const first = controller.prepare(createRepository(), 'first')
    const second = controller.prepare(createRepository(), 'second')
    await flush()
    controller.dispose()
    await first
    await second
  })

  it('should ignore a late start rejection after the request was stopped', async () => {
    let rejectStart: ((error: unknown) => void) | undefined
    const controller = createEntryPlaybackController()
    const playback = controller.playSequence(createRepository(), {
      dialogueIds: [DIALOGUE.id],
      onDialogueStart: () =>
        new Promise((_resolve, reject) => {
          rejectStart = reject
        }),
      onSequenceStop: vi.fn(),
    })
    await flush()
    controller.stop()
    rejectStart?.(new Error('late start failure'))
    await playback
    await flush()
  })

  it('should abandon a start when cancellation happens during context suspension', async () => {
    let resolveSuspension: (() => void) | undefined
    const context = {
      close: vi.fn().mockResolvedValue(undefined),
      createMediaElementSource: vi.fn(() => ({connect: vi.fn(), disconnect: vi.fn()})),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      state: 'running',
      suspend: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              resolveSuspension = resolve
            }),
        )
        .mockResolvedValue(undefined),
    }
    vi.stubGlobal(
      'AudioContext',
      class {
        close = context.close
        createMediaElementSource = context.createMediaElementSource
        destination = context.destination
        resume = context.resume
        state = context.state
        suspend = context.suspend
      },
    )
    const controller = createEntryPlaybackController()
    const first = controller.prepare(createRepository(), 'first')
    await flush()
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await first
    await flush()

    const second = controller.prepare(createRepository(), 'second')
    await flush()
    await flush()
    controller.cancel()
    resolveSuspension?.()
    await second
    await flush()
  })

  it('should cancel before starting the next item after an ended event', async () => {
    const controller = createEntryPlaybackController()
    const playback = controller.playSequence(createRepository(), {
      dialogueIds: ['first', 'second'],
      onDialogueStart: vi.fn(),
      onSequenceStop: vi.fn(),
    })
    await flush()
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    controller.cancel()
    await playback
    await flush()
  })
})
