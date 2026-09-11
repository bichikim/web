import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createLoopPlayer} from '../player'

const media: Media[] = []
const gains: ReturnType<typeof gain>[] = []
function gain() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
      cancelScheduledValues: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
    },
  }
}
class Media {
  duration = 120
  currentTime = 0
  paused = true
  preload = ''
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  onloadedmetadata: (() => void) | null = null
  constructor() {
    media.push(this)
  }
  play = vi.fn(async () => {
    this.paused = false
  })
  pause = vi.fn(() => {
    this.paused = true
  })
  removeAttribute = vi.fn()
  load = vi.fn()
}
const close = vi.fn(async () => {})
beforeEach(() => {
  vi.useFakeTimers()
  media.length = 0
  gains.length = 0
  vi.stubGlobal('Audio', Media)
  vi.stubGlobal(
    'AudioContext',
    class {
      currentTime = 10
      destination = {}
      resume = vi.fn(async () => {})
      close = close
      createGain() {
        const node = gain()
        gains.push(node)
        return node
      }
      createMediaElementSource() {
        return {connect: vi.fn()}
      }
    },
  )
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
it('should start the next copy at zero and crossfade both gains over four seconds', async () => {
  const status = vi.fn()
  const player = createLoopPlayer('blob:audio', status, vi.fn())
  await player.play()
  media[0].currentTime = 116
  await vi.advanceTimersByTimeAsync(50)
  expect(media[1].play).toHaveBeenCalledOnce()
  expect(media[1].currentTime).toBe(0)
  expect(gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 14)
  expect(gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, 14)
  media[0].onended?.()
  media[1].currentTime = 116
  await vi.advanceTimersByTimeAsync(50)
  expect(media[0].play).toHaveBeenCalledTimes(2)
  await player.close()
})
it('should preview immediately before the overlap and stop all scheduled work', async () => {
  const player = createLoopPlayer('blob:audio', vi.fn(), vi.fn())
  await player.play(8, true)
  expect(media[0].currentTime).toBe(111)
  player.stop()
  await vi.advanceTimersByTimeAsync(1000)
  expect(media.every((item) => item.paused)).toBe(true)
  expect(media[1].play).not.toHaveBeenCalled()
  await player.close()
  expect(close).toHaveBeenCalledOnce()
})
it.each([0, -1, 61, NaN, Infinity])('should reject invalid overlap %s', async (seconds) => {
  const player = createLoopPlayer('blob:audio', vi.fn(), vi.fn())
  await expect(player.play(seconds)).rejects.toThrow()
  expect(media[0].play).not.toHaveBeenCalled()
  await player.close()
})
it('should stop both copies and report a rejected overlap playback', async () => {
  const status = vi.fn()
  const player = createLoopPlayer('blob:audio', status, vi.fn())
  await player.play()
  media[1].play.mockRejectedValueOnce(new Error('blocked'))
  media[0].currentTime = 116
  await vi.advanceTimersByTimeAsync(50)
  expect(status).toHaveBeenLastCalledWith('blocked', false)
  expect(media.every((item) => item.paused)).toBe(true)
  await player.close()
})

it('should seek during crossfade, cancel both ramps and resume only at the selected position', async () => {
  const position = vi.fn()
  const player = createLoopPlayer('blob:audio', vi.fn(), vi.fn(), position)
  await player.play()
  media[0].currentTime = 116
  await vi.advanceTimersByTimeAsync(50)
  await player.seek(60)
  expect(media[0].currentTime).toBe(60)
  expect(media[0].paused).toBe(false)
  expect(media[1].paused).toBe(true)
  expect(position).toHaveBeenLastCalledWith(60)
  await player.close()
})
it('should seek while stopped without autoplay and wrap an end-position seek to zero', async () => {
  const position = vi.fn()
  const player = createLoopPlayer('blob:audio', vi.fn(), vi.fn(), position)
  await player.seek(42)
  expect(media[0].play).not.toHaveBeenCalled()
  expect(position).toHaveBeenLastCalledWith(42)
  await player.play(4, false, 42)
  expect(media[0].currentTime).toBe(42)
  await player.seek(120)
  expect(media[0].currentTime).toBe(0)
  await expect(player.seek(NaN)).rejects.toThrow()
  await expect(player.seek(121)).rejects.toThrow()
  await player.close()
})
