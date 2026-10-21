/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {DEFAULT_CONNECTION_SECONDS} from '../../sound-generation/connection'
import {createLoopPlayer, type LoopPlayback} from '../player'
import {useLoopPlayer} from '../use-loop-player'

vi.mock('../player', () => ({createLoopPlayer: vi.fn()}))

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:loop-player')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function createFixture() {
  const playback: LoopPlayback = {
    close: vi.fn(async () => {}),
    play: vi.fn(async () => true),
    seek: vi.fn(async () => false),
    setVolume: vi.fn(),
    stop: vi.fn(),
  }
  let reportPosition: ((seconds: number) => void) | undefined
  vi.mocked(createLoopPlayer).mockImplementation((_url, _status, ready, onPosition) => {
    reportPosition = onPosition
    ready(30)
    return playback
  })
  const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))
  return {...root, playback, reportPosition: (seconds: number) => reportPosition?.(seconds)}
}

it.each([false, true])(
  'should resume position updates when play(%s) supersedes an uncommitted scrub',
  async (preview) => {
    const root = createFixture()
    try {
      root.player.select(new File(['audio'], 'tone.wav', {type: 'audio/wav'}))
      root.reportPosition(3)
      root.player.previewPosition(12.5)
      root.reportPosition(4)
      expect(root.player.position()).toBe(12.5)

      await root.player.play(preview)
      expect(root.playback.play).toHaveBeenCalledExactlyOnceWith(
        DEFAULT_CONNECTION_SECONDS,
        preview,
        12.5,
      )
      expect(root.playback.seek).not.toHaveBeenCalled()
      root.reportPosition(13.3)

      expect(root.player.position()).toBe(13.3)
      expect(root.player.playing()).toBe(true)
    } finally {
      root.dispose()
    }
  },
)

it.each(['resolve', 'reject'] as const)(
  'should ignore a stale seek that later %s after play replaces a scrub',
  async (outcome) => {
    const root = createFixture()
    const pending = Promise.withResolvers<boolean>()
    vi.mocked(root.playback.seek).mockReturnValueOnce(pending.promise)
    try {
      root.player.select(new File(['audio'], 'tone.wav'))
      root.player.previewPosition(8)
      const seeking = root.player.seek()
      root.player.previewPosition(12.5)
      await root.player.play(false)
      root.reportPosition(13.3)
      const status = root.player.status()

      if (outcome === 'resolve') {
        pending.resolve(false)
      } else {
        pending.reject(new Error('stale seek failed'))
      }
      await seeking

      expect(root.player.position()).toBe(13.3)
      expect(root.player.playing()).toBe(true)
      expect(root.player.status()).toBe(status)
    } finally {
      root.dispose()
    }
  },
)

it.each(['false', 'reject'] as const)(
  'should recover position updates after a scrubbed start returns %s and is retried',
  async (outcome) => {
    const root = createFixture()
    if (outcome === 'false') {
      vi.mocked(root.playback.play).mockResolvedValueOnce(false)
    } else {
      vi.mocked(root.playback.play).mockRejectedValueOnce(new Error('start failed'))
    }
    try {
      root.player.select(new File(['audio'], 'tone.wav'))
      root.player.previewPosition(12.5)
      await root.player.play(false)
      expect(root.player.playing()).toBe(false)
      expect(root.player.position()).toBe(12.5)

      await root.player.play(false)
      root.reportPosition(13.3)

      expect(root.player.position()).toBe(13.3)
      expect(root.player.playing()).toBe(true)
    } finally {
      root.dispose()
    }
  },
)
