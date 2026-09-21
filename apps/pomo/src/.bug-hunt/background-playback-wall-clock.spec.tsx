/** @vitest-environment jsdom */
/**
 * Bug: usePlayback measures slide deadlines with Date.now(), so a system clock jump
 * can fire advance() immediately when the slide timer effect re-runs.
 *
 * Screen saver already uses getMonotonicTime() for the same class of problem.
 */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {DEFAULT_BACKGROUND} from '../features/background/model'
import type {BackgroundController} from '../features/background/use-background'
import {usePlayback} from '../features/background/use-playback'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => vi.useRealTimers())

const setupPhotoSlideshow = () => {
  const [preferences, setPreferences] = createSignal({
    ...DEFAULT_BACKGROUND,
    photoSeconds: 10,
    videoMode: 'loop' as const,
  })
  const background = {
    failedIds: () => [],
    items: () => [
      {id: 'photo-a', kind: 'photo', name: 'a', size: 1},
      {id: 'photo-b', kind: 'photo', name: 'b', size: 1},
    ],
    preferences,
  } as unknown as BackgroundController
  const hook = renderHook(() => usePlayback({background}))
  hook.result.onReady()
  return {...hook, setPreferences}
}

it('should not advance a photo early when preferences change after a system clock jump', () => {
  const {cleanup, result, setPreferences} = setupPhotoSlideshow()

  expect(result.current()?.id).toBe('photo-a')

  vi.advanceTimersByTime(4_000)
  vi.setSystemTime(60_000)
  setPreferences((previous) => ({...previous, photoSeconds: 9}))

  expect(result.current()?.id).toBe('photo-a')

  cleanup()
})

it('should advance a photo only after the configured photoSeconds elapse', () => {
  const {cleanup, result} = setupPhotoSlideshow()

  expect(result.current()?.id).toBe('photo-a')

  vi.advanceTimersByTime(10_000)

  expect(result.current()?.id).toBe('photo-b')

  cleanup()
})
