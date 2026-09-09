/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type BackgroundPreferences, DEFAULT_BACKGROUND} from '../model'
import {type BackgroundController} from '../use-background'
import {usePlayback} from '../use-playback'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})
afterEach(() => vi.useRealTimers())
const setup = (videoMode: BackgroundPreferences['videoMode']) => {
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
  hook.result.onVideoStart()
  hook.result.onReady()
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
