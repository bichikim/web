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
  ontimeupdate: (() => void) | null = null
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
  media[0].ontimeupdate?.()
  await Promise.resolve()
  expect(media[1].play).toHaveBeenCalledOnce()
  expect(media[1].currentTime).toBe(0)
  expect(gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 14)
  expect(gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, 14)
  media[0].paused = true
  media[0].onended?.()
  await Promise.resolve()
  media[1].currentTime = 116
  media[1].ontimeupdate?.()
  await Promise.resolve()
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
  media[0].ontimeupdate?.()
  await Promise.resolve()
  expect(status).toHaveBeenLastCalledWith('blocked', false)
  expect(media.every((item) => item.paused)).toBe(true)
  await player.close()
})

it('should seek during crossfade, cancel both ramps and resume only at the selected position', async () => {
  const position = vi.fn()
  const player = createLoopPlayer('blob:audio', vi.fn(), vi.fn(), position)
  await player.play()
  media[0].currentTime = 116
  media[0].ontimeupdate?.()
  await Promise.resolve()
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

it('should use time updates without timers and ignore inactive or early updates', async () => {
  const player = createLoopPlayer('blob:audio', vi.fn(), vi.fn())
  await player.play()
  expect(vi.getTimerCount()).toBe(0)
  media[1].currentTime = 119
  media[1].ontimeupdate?.()
  media[0].currentTime = 115
  media[0].ontimeupdate?.()
  expect(media[1].play).not.toHaveBeenCalled()
  media[0].currentTime = 116
  media[0].ontimeupdate?.()
  media[0].ontimeupdate?.()
  await Promise.resolve()
  expect(media[1].play).toHaveBeenCalledOnce()
  await player.close()
  expect(media.every((item) => item.ontimeupdate === null)).toBe(true)
})

it('should ignore time updates and ended events after stopping', async () => {
  const status = vi.fn()
  const player = createLoopPlayer('blob:audio', status, vi.fn())
  await player.play()
  player.stop()
  status.mockClear()
  media[0].currentTime = 120
  media[0].ontimeupdate?.()
  media[0].onended?.()
  await Promise.resolve()
  expect(media[1].play).not.toHaveBeenCalled()
  expect(status).not.toHaveBeenCalled()
  await player.close()
})

it('should continue a short overlap when time updates miss its transition window', async () => {
  const status = vi.fn()
  const player = createLoopPlayer('blob:audio', status, vi.fn())
  await player.play(0.1)
  media[0].currentTime = 119.75
  media[0].ontimeupdate?.()
  expect(media[1].play).not.toHaveBeenCalled()
  media[0].currentTime = 120
  media[0].paused = true
  media[0].onended?.()
  await Promise.resolve()
  await Promise.resolve()
  expect(media[0].play).toHaveBeenCalledTimes(2)
  expect(status).toHaveBeenLastCalledWith('루프 재생 중', true)
  await player.close()
})

it('should wait for pending handoff and ignore it after stop', async () => {
  const status = vi.fn()
  const player = createLoopPlayer('blob:audio', status, vi.fn())
  await player.play()
  const pending = Promise.withResolvers<void>()
  media[1].play.mockReturnValueOnce(pending.promise)
  media[0].currentTime = 116
  media[0].ontimeupdate?.()
  media[0].paused = true
  media[0].onended?.()
  player.stop()
  status.mockClear()
  pending.resolve()
  await Promise.resolve()
  await Promise.resolve()
  expect(status).not.toHaveBeenCalled()
  await player.close()
})

it('should ignore a pending transition completion after stop', async () => {
  const status = vi.fn()
  const player = createLoopPlayer('blob:audio', status, vi.fn())
  await player.play()
  const pending = Promise.withResolvers<void>()
  media[1].play.mockReturnValueOnce(pending.promise)
  media[0].currentTime = 116
  media[0].ontimeupdate?.()
  player.stop()
  status.mockClear()
  pending.resolve()
  await Promise.resolve()
  expect(status).not.toHaveBeenCalled()
  expect(gains[1].gain.linearRampToValueAtTime).not.toHaveBeenCalled()
  await player.close()
})
