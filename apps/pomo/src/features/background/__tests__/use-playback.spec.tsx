/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type BackgroundPreferences, DEFAULT_BACKGROUND} from '../model'
import {type BackgroundController} from '../use-background'
import {usePlayback} from '../use-playback'
import {getMonotonicTime} from 'src/utils/get-monotonic-time'

vi.mock('src/utils/get-monotonic-time', () => ({getMonotonicTime: vi.fn()}))

const monotonicTime = vi.mocked(getMonotonicTime)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  monotonicTime.mockImplementation(() => vi.getMockedSystemTime()?.getTime() ?? 0)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})
const setup = (videoMode: BackgroundPreferences['videoMode'], initializeVideo = true) => {
  const [preferences, setPreferences] = createSignal({...DEFAULT_BACKGROUND, videoMode})
  const background = {
    failedIds: () => [],
    items: () => [
      {id: 'video', kind: 'video', name: 'video', size: 1},
      {id: 'photo', kind: 'photo', name: 'photo', size: 1},
    ],
    preferences,
  } as unknown as BackgroundController
  const hook = renderHook(() => usePlayback({background}))
  if (initializeVideo) {
    hook.result.onVideoStart()
    hook.result.onReady()
  }
  return {...hook, setPreferences}
}
it('should ignore display time in end mode', () => {
  const {result, cleanup} = setup('end')
  vi.advanceTimersByTime(20_000)
  expect(result.current()?.id).toBe('video')
  result.onEnded()
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should count video playback toward the hold deadline', () => {
  const {result, cleanup} = setup('hold')
  vi.advanceTimersByTime(4000)
  result.onEnded()
  vi.advanceTimersByTime(5999)
  expect(result.current()?.id).toBe('video')
  vi.advanceTimersByTime(1)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should preserve the ready deadline when video starts after the frame is ready', () => {
  const {result, cleanup} = setup('hold', false)
  result.onReady()
  vi.advanceTimersByTime(5000)
  result.onVideoStart()
  vi.advanceTimersByTime(4000)
  result.onEnded()
  vi.advanceTimersByTime(999)
  expect(result.current()?.id).toBe('video')
  vi.advanceTimersByTime(1)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should finish a long video before leaving hold mode', () => {
  const {result, cleanup} = setup('hold')
  vi.advanceTimersByTime(15_000)
  expect(result.current()?.id).toBe('video')
  result.onEnded()
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should leave loop mode at the deadline even before video completion', () => {
  const {result, cleanup} = setup('loop')
  vi.advanceTimersByTime(10_000)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should preserve elapsed time when duration changes', () => {
  const {result, cleanup, setPreferences} = setup('loop')
  vi.advanceTimersByTime(4000)
  setPreferences((previous) => ({...previous, photoSeconds: 5}))
  vi.advanceTimersByTime(1000)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should ignore wall-clock jumps when rescheduling the deadline', () => {
  const {result, cleanup, setPreferences} = setup('loop')
  vi.advanceTimersByTime(4000)
  const wallTime = Date.now()
  vi.spyOn(Date, 'now').mockReturnValue(wallTime + 60_000)
  setPreferences((previous) => ({...previous}))
  expect(result.current()?.id).toBe('video')
  vi.advanceTimersByTime(5999)
  expect(result.current()?.id).toBe('video')
  vi.advanceTimersByTime(1)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should handle a video ending during the entry transition', () => {
  const {result, cleanup} = setup('end')
  result.onLoading()
  result.onVideoStart()
  result.onEnded()
  expect(result.current()?.id).toBe('video')
  result.onReady()
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
