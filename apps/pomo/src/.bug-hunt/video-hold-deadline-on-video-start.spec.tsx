/** @vitest-environment jsdom */

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

it('should keep the hold deadline anchored to onReady when onVideoStart arrives later', () => {
  const [preferences] = createSignal({...DEFAULT_BACKGROUND, videoMode: 'hold' as const})
  const background = {
    failedIds: () => [],
    items: () => [{id: 'video', kind: 'video', name: 'video', size: 1}],
    preferences,
  } as unknown as BackgroundController
  const {result, cleanup} = renderHook(() => usePlayback({background}))

  result.onReady()
  vi.advanceTimersByTime(5_000)
  result.onVideoStart()
  vi.advanceTimersByTime(4_000)
  result.onEnded()

  vi.advanceTimersByTime(999)
  expect(result.current()?.id).toBe('video')

  vi.advanceTimersByTime(1)
  expect(result.current()?.id).toBe('photo')

  cleanup()
})
