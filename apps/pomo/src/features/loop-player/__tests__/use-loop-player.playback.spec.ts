/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useLoopPlayer} from '../use-loop-player'

type PauseOutcome = 'resolve' | 'reject'

class TestAudio {
  static readonly elements: TestAudio[] = []
  static playOutcomes: PauseOutcome[] = []

  currentTime = 0
  duration = 30
  paused = true
  preload = ''
  src = ''
  crossOrigin = ''
  ontimeupdate: (() => void) | null = null
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  onloadedmetadata: (() => void) | null = null
  private pauseRevision = 0
  private pendingPlay:
    | {
        readonly deferred: ReturnType<typeof Promise.withResolvers<void>>
        readonly outcome: PauseOutcome
      }
    | undefined

  constructor() {
    TestAudio.elements.push(this)
  }

  play = vi.fn(() => {
    const outcome = TestAudio.playOutcomes.shift()
    if (outcome === undefined) {
      return this.resolvePlayback()
    }
    const deferred = Promise.withResolvers<void>()
    const pauseRevision = this.pauseRevision
    this.pendingPlay = {deferred, outcome}
    return deferred.promise.then(() => {
      if (pauseRevision === this.pauseRevision) {
        this.paused = false
      }
    })
  })

  pause = vi.fn(() => {
    this.pauseRevision += 1
    this.paused = true
    const pending = this.pendingPlay
    this.pendingPlay = undefined
    if (pending === undefined) {
      return
    }
    if (pending.outcome === 'reject') {
      pending.deferred.reject(new DOMException('play was interrupted by pause', 'AbortError'))
      return
    }
    pending.deferred.resolve()
  })

  removeAttribute = vi.fn()
  load = vi.fn()

  private resolvePlayback() {
    const pauseRevision = this.pauseRevision
    return Promise.resolve().then(() => {
      if (pauseRevision === this.pauseRevision) {
        this.paused = false
      }
    })
  }
}

class TestAudioContext {
  currentTime = 0
  destination = {}
  resume = vi.fn(async () => {})
  close = vi.fn(async () => {})
  createGain = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
      cancelScheduledValues: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
      value: 1,
    },
  }))
  createMediaElementSource = vi.fn(() => ({connect: vi.fn()}))
}

beforeEach(() => {
  TestAudio.elements.length = 0
  TestAudio.playOutcomes = []
  vi.stubGlobal('Audio', TestAudio)
  vi.stubGlobal('AudioContext', TestAudioContext)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:loop-player')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it.each(['resolve', 'reject'] as const)(
  'should clear the hook playing state when seek cancels a pending start that later %s',
  async (outcome) => {
    TestAudio.playOutcomes = [outcome]
    const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))
    try {
      root.player.select(new File(['audio'], 'tone.wav', {type: 'audio/wav'}))
      for (const element of TestAudio.elements) {
        element.onloadedmetadata?.()
      }

      const starting = root.player.play(false)
      expect(root.player.playing()).toBe(true)
      root.player.previewPosition(18)
      const seeking = root.player.seek()

      await Promise.all([starting, seeking])

      expect(TestAudio.elements[0].paused).toBe(true)
      expect(root.player.position()).toBe(18)
      expect(root.player.playing()).toBe(false)
    } finally {
      root.dispose()
    }
  },
)

it('should ignore a cancelled start after stop and a new start in the same owner', async () => {
  TestAudio.playOutcomes = ['reject']
  const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))
  try {
    root.player.select(new File(['audio'], 'tone.wav', {type: 'audio/wav'}))
    for (const element of TestAudio.elements) {
      element.onloadedmetadata?.()
    }

    const cancelled = root.player.play(false)
    root.player.stop()
    const current = root.player.play(false)
    await Promise.all([cancelled, current])

    expect(root.player.playing()).toBe(true)
    expect(root.player.status()).toBe('루프 재생 중')
    expect(TestAudio.elements[0].paused).toBe(false)
  } finally {
    root.dispose()
  }
})

it('should ignore a cancelled start after replacing the file in the same owner', async () => {
  TestAudio.playOutcomes = ['reject']
  vi.mocked(URL.createObjectURL)
    .mockReturnValueOnce('blob:first')
    .mockReturnValueOnce('blob:second')
  const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))
  try {
    root.player.select(new File(['first'], 'first.wav', {type: 'audio/wav'}))
    for (const element of TestAudio.elements) {
      element.onloadedmetadata?.()
    }
    const cancelled = root.player.play(false)

    root.player.select(new File(['second'], 'second.wav', {type: 'audio/wav'}))
    for (const element of TestAudio.elements.slice(2)) {
      element.onloadedmetadata?.()
    }
    const current = root.player.play(false)
    await Promise.all([cancelled, current])

    expect(root.player.playing()).toBe(true)
    expect(root.player.status()).toBe('루프 재생 중')
    expect(TestAudio.elements[2].paused).toBe(false)
  } finally {
    root.dispose()
  }
})

it('should keep active playback when seeking after a start completes', async () => {
  const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))
  try {
    root.player.select(new File(['audio'], 'tone.wav', {type: 'audio/wav'}))
    for (const element of TestAudio.elements) {
      element.onloadedmetadata?.()
    }
    await root.player.play(false)

    root.player.previewPosition(18)
    await root.player.seek()

    expect(root.player.position()).toBe(18)
    expect(root.player.playing()).toBe(true)
    expect(TestAudio.elements[0].paused).toBe(false)
    expect(TestAudio.elements[0].play).toHaveBeenCalledTimes(2)
  } finally {
    root.dispose()
  }
})
