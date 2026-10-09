/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'
import {createLoopPlayer, type LoopPlayback} from '../features/loop-player/player'
import {useLoopPlayer} from '../features/loop-player/use-loop-player'

vi.mock('../features/loop-player/player', () => ({createLoopPlayer: vi.fn()}))

const createFile = () => new File(['audio'], 'track.mp3', {type: 'audio/mpeg'})

const createPlayback = (): LoopPlayback => ({
  close: async () => {},
  play: vi.fn(async () => {}),
  seek: vi.fn(async () => {}),
  setVolume: vi.fn(),
  stop: vi.fn(),
})

type PlayerCallbacks = {
  onPosition: (seconds: number) => void
  onReady: (duration: number) => void
  onStatus: (message: string, playing: boolean) => void
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should follow playback position updates after play commits a scrubbed slider value', async () => {
  const playback = createPlayback()
  let callbacks: PlayerCallbacks | undefined
  vi.mocked(createLoopPlayer).mockImplementation((_url, onStatus, onReady, onPosition) => {
    callbacks = {
      onPosition: onPosition ?? (() => undefined),
      onReady,
      onStatus,
    }
    return playback
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))

  root.player.select(createFile())
  callbacks?.onReady(120)
  callbacks?.onPosition(30)
  root.player.previewPosition(60)
  expect(root.player.position()).toBe(60)

  await root.player.play(false)
  callbacks?.onPosition(12)

  expect(root.player.position()).toBe(12)
  root.dispose()
})
