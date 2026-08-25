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
  it('should resolve missing dialogue and audio without starting playback', async () => {
    const controller = createEntryPlaybackController()

    await expect(
      controller.prepare(createRepository(null), 'missing-dialogue'),
    ).resolves.toBeUndefined()
    await expect(
      controller.prepare(createRepository(DIALOGUE, null), 'missing-audio'),
    ).resolves.toBeUndefined()
    expect(controller.isPlaying()).toBe(false)
    expect(controller.scheduledDialogueCount()).toBe(0)
  })

  it('should expose subtitle, mood, viseme, and finish a played dialogue', async () => {
    const mood = {primary: {id: 'calm', probability: 1}} as never
    const dialogue = {...DIALOGUE, segments: [{...DIALOGUE.segments[0], mood}]}
    const controller = createEntryPlaybackController()
    const playback = controller.prepare(createRepository(dialogue), dialogue.id)
    await flush()
    const audio = latestAudio()
    await flush()

    expect(controller.activeDialogueId()).toBe(dialogue.id)
    expect(controller.activeSegmentCount()).toBe(1)
    expect(controller.activeSegmentMood()).toBe(mood)
    expect(controller.activeSegmentPosition()).toBe(0)
    expect(controller.activeText()).toBe('안녕하세요')
    expect(controller.activeViseme()).toBe('open')
    expect(controller.isPlaying()).toBe(true)
    expect(controller.isDialogueScheduled(dialogue.id)).toBe(true)

    audio.dispatchEvent(new Event('ended'))
    await expect(playback).resolves.toBeUndefined()
    await flush()
    animationFrames.at(-1)?.(0)
    controller.cancel()
    expect(controller.activeDialogueId()).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:dialogue')
  })

  it('should finish on an audio error and ignore stale audio events', async () => {
    const controller = createEntryPlaybackController()
    const first = controller.prepare(createRepository(), 'first')
    await flush()
    const firstAudio = latestAudio()
    controller.skip()
    await first
    await flush()

    const second = controller.prepare(createRepository({...DIALOGUE, id: 'second'}), 'second')
    await flush()
    firstAudio.dispatchEvent(new Event('ended'))
    firstAudio.dispatchEvent(new Event('error'))
    latestAudio().dispatchEvent(new Event('error'))
    await expect(second).resolves.toBeUndefined()
  })

  it('should block autoplay, retry after interaction, and ignore retry otherwise', async () => {
    TestAudio.playImplementation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
      .mockResolvedValue(undefined)
    const controller = createEntryPlaybackController()
    const playback = controller.prepare(createRepository(), DIALOGUE.id)
    await flush()
    const audio = latestAudio()
    await flush()

    expect(controller.isBlocked()).toBe(true)
    controller.retry()
    await flush()
    expect(controller.isBlocked()).toBe(false)
    audio.dispatchEvent(new Event('ended'))
    await playback

    TestAudio.playImplementation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
      .mockResolvedValue(undefined)
    const blockedController = createEntryPlaybackController()
    const blockedPlayback = blockedController.prepare(createRepository(), DIALOGUE.id)
    await flush()
    const blockedAudio = latestAudio()
    await flush()
    blockedController.retry()
    blockedAudio.dispatchEvent(new Event('ended'))
    await blockedPlayback
  })

  it('should fail a non-autoplay playback error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    TestAudio.playImplementation = () => Promise.reject(new Error('speaker failed'))
    const controller = createEntryPlaybackController()
    const playback = controller.prepare(createRepository(), DIALOGUE.id)
    await flush()
    await playback
    expect(error).toHaveBeenCalled()
  })

  it('should stop active and queued requests and report stop callback failures', async () => {
    const controller = createEntryPlaybackController()
    const onStop = vi.fn().mockRejectedValue(new Error('stop failed'))
    const first = controller.playSequence(createRepository(), {
      dialogueIds: ['first', 'second'],
      onDialogueStart: vi.fn(),
      onSequenceStop: onStop,
    })
    const second = controller.playSequence(createRepository(), {
      dialogueIds: ['third'],
      onDialogueStart: vi.fn(),
      onSequenceStop: onStop,
    })
    await flush()

    expect(controller.scheduledDialogueCount()).toBe(3)
    expect(controller.isDialogueScheduled('third')).toBe(true)
    controller.stop()
    await expect(first).rejects.toThrow('stop failed')
    await expect(second).rejects.toThrow('stop failed')
  })

  it('should reject a request when its start callback fails', async () => {
    const controller = createEntryPlaybackController()
    const playback = controller.playSequence(createRepository(), {
      dialogueIds: [DIALOGUE.id],
      onDialogueStart: () => {
        throw new Error('start failed')
      },
      onSequenceStop: vi.fn(),
    })

    await expect(playback).rejects.toThrow('start failed')
  })

  it('should dispose analyzer, source, and audio context safely', async () => {
    const source = {connect: vi.fn(), disconnect: vi.fn()}
    const context = {
      close: vi.fn().mockRejectedValue(new Error('close failed')),
      createMediaElementSource: vi.fn(() => source),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      state: 'running',
      suspend: vi.fn().mockRejectedValue(new Error('suspend failed')),
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

    controller.dispose()
    await playback
    expect(playbackMocks.analyzerDisconnect).toHaveBeenCalledWith(source)
    expect(source.disconnect).toHaveBeenCalled()
    expect(playbackMocks.analyzerDispose).toHaveBeenCalled()
    expect(context.close).toHaveBeenCalled()
    controller.dispose()
  })

  it('should read legacy audio through FileReader and tolerate invalid or failed reads', async () => {
    const legacyAudio = {} as Blob
    const readers: Array<{
      readonly listeners: Map<string, FileReaderListener>
      result: ArrayBuffer | string | null
    }> = []
    vi.stubGlobal(
      'FileReader',
      class {
        readonly listeners = new Map<string, FileReaderListener>()
        result: ArrayBuffer | string | null = new ArrayBuffer(4)
        error = new Error('read failed')

        constructor() {
          readers.push(this)
        }

        addEventListener(event: string, listener: () => void) {
          this.listeners.set(event, listener)
        }

        readAsArrayBuffer() {
          this.listeners.get('load')?.()
        }
      },
    )
    const first = createEntryPlaybackController()
    const firstPlayback = first.prepare(createRepository(DIALOGUE, legacyAudio), DIALOGUE.id)
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await firstPlayback
    expect(playbackMocks.createEnvelope).toHaveBeenCalled()

    readers.length = 0
    vi.stubGlobal(
      'FileReader',
      class {
        result = 'invalid'
        error = new Error('read failed')
        private listener: (() => void) | undefined
        addEventListener(event: string, listener: () => void) {
          if (event === 'load') {
            this.listener = listener
          }
        }
        readAsArrayBuffer() {
          this.listener?.()
        }
      },
    )
    const invalid = createEntryPlaybackController()
    const invalidPlayback = invalid.prepare(createRepository(DIALOGUE, legacyAudio), DIALOGUE.id)
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await invalidPlayback

    vi.stubGlobal(
      'FileReader',
      class {
        result = null
        error = new Error('read failed')
        private listener: (() => void) | undefined
        addEventListener(event: string, listener: () => void) {
          if (event === 'error') {
            this.listener = listener
          }
        }
        readAsArrayBuffer() {
          this.listener?.()
        }
      },
    )
    const failed = createEntryPlaybackController()
    const failedPlayback = failed.prepare(createRepository(DIALOGUE, legacyAudio), DIALOGUE.id)
    await flush()
    latestAudio().dispatchEvent(new Event('ended'))
    await failedPlayback
  })

  it('should use analyzer frames and preserve rest for an inactive subtitle position', async () => {
    playbackMocks.position.mockReturnValue(null)
    playbackMocks.driverUpdate.mockReturnValue('rest')
    playbackMocks.analyzerFrame.mockReturnValue({intensity: 0.8, viseme: 'round'})
    const context = {
      close: vi.fn().mockResolvedValue(undefined),
      createMediaElementSource: vi.fn(() => ({connect: vi.fn(), disconnect: vi.fn()})),
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
    const playback = controller.prepare(createRepository(), DIALOGUE.id)
    await flush()
    await flush()
    expect(controller.activeSegmentMood()).toBeNull()
    expect(controller.activeSegmentPosition()).toBeNull()
    expect(controller.activeText()).toBeNull()
    expect(controller.activeViseme()).toBe('rest')
    expect(playbackMocks.driverUpdate).toHaveBeenCalledWith(
      expect.objectContaining({intensity: 0.8, viseme: 'round'}),
    )
    latestAudio().dispatchEvent(new Event('ended'))
    await playback
    vi.runAllTimers()
    expect(controller.activeViseme()).toBe('rest')
  })

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
    expect(controller.activeViseme()).toBe('rest')
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
