/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createMedia} from '../media'

beforeEach(() => {
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:media'), revokeObjectURL: vi.fn()})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
const options = () => ({
  blob: new Blob(['media']),
  kind: 'photo' as const,
  onEnded: vi.fn(),
  onError: vi.fn(),
})

it('should settle on load and release listeners and its URL once', async () => {
  const callbacks = options()
  const media = createMedia(callbacks)
  expect(media.source.src).toBe('blob:media')
  media.source.dispatchEvent(new Event('load'))
  await expect(media.ready).resolves.toBe(true)
  media.source.dispatchEvent(new Event('error'))
  expect(callbacks.onError).toHaveBeenCalledOnce()
  media.dispose()
  media.dispose()
  media.source.dispatchEvent(new Event('error'))
  media.source.dispatchEvent(new Event('ended'))
  expect(callbacks.onError).toHaveBeenCalledOnce()
  expect(callbacks.onEnded).not.toHaveBeenCalled()
  expect(media.source.hasAttribute('src')).toBe(false)
  expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
})

it('should cancel pending readiness and ignore late load and error events', async () => {
  vi.useFakeTimers()
  const callbacks = options()
  const media = createMedia(callbacks)
  media.cancel()
  media.source.dispatchEvent(new Event('load'))
  media.source.dispatchEvent(new Event('error'))
  await expect(media.ready).resolves.toBe(false)
  expect(callbacks.onError).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
  media.dispose()
})

it('should fail stalled loading after its deadline and ignore late success', async () => {
  vi.useFakeTimers()
  const media = createMedia(options())
  await vi.advanceTimersByTimeAsync(30_000)
  await expect(media.ready).resolves.toBe(false)
  media.source.dispatchEvent(new Event('load'))
  await expect(media.ready).resolves.toBe(false)
  media.dispose()
  expect(vi.getTimerCount()).toBe(0)
})

it('should settle decoding errors before loading without emitting a playback error', async () => {
  const callbacks = options()
  const media = createMedia(callbacks)
  media.source.dispatchEvent(new Event('error'))
  await expect(media.ready).resolves.toBe(false)
  expect(callbacks.onError).not.toHaveBeenCalled()
  media.dispose()
})

it('should configure inline muted video and stop decoding on disposal', async () => {
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const callbacks = {...options(), kind: 'video' as const}
  const media = createMedia(callbacks)
  expect(media.video?.muted).toBe(true)
  expect(media.video?.defaultMuted).toBe(true)
  expect(media.video?.playsInline).toBe(true)
  expect(load).toHaveBeenCalledOnce()
  media.source.dispatchEvent(new Event('loadeddata'))
  await expect(media.ready).resolves.toBe(true)
  media.source.dispatchEvent(new Event('ended'))
  expect(callbacks.onEnded).toHaveBeenCalledOnce()
  media.dispose()
  expect(pause).toHaveBeenCalledOnce()
  expect(load).toHaveBeenCalledTimes(2)
  expect(media.source.hasAttribute('src')).toBe(false)
})
