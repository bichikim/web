/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  RANDOM_EVENT_SETTINGS_CHANGED_EVENT,
  writeRandomEventSettings,
} from '../random-event-settings'
import {getRandomEventDelay, useRandomEvent, type UseRandomEventProps} from '../use-random-event'

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), setItem: vi.fn()},
}))

const renderRandomEvent = (props: UseRandomEventProps) =>
  render(() => {
    useRandomEvent(props)
    return null
  })

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('should calculate a delay within the configured interval', () => {
  expect(getRandomEventDelay({maximumMinutes: 20, minimumMinutes: 10, version: 1}, () => 0.5)).toBe(
    15 * 60_000,
  )
})

it('should keep triggering random events while earlier playback is still queued', async () => {
  const settings = {maximumMinutes: 2, minimumMinutes: 2, version: 1} as const
  await writeRandomEventSettings(settings)
  const playbackResolvers: Array<() => void> = []
  const onEvent = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        playbackResolvers.push(resolve)
      }),
  )
  const result = renderRandomEvent({onEvent})
  await vi.advanceTimersByTimeAsync(0)

  await vi.advanceTimersByTimeAsync(2 * 60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(2 * 60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(2 * 60_000)
  expect(onEvent).toHaveBeenCalledTimes(3)
  playbackResolvers.forEach((resolve) => resolve())
  result.unmount()
})

it('should keep scheduling without playback and stop after unmount', async () => {
  localStorage.setItem(
    'pomo:random-event-settings:v1',
    JSON.stringify({isEnabled: false, maximumMinutes: 1, minimumMinutes: 1, version: 1}),
  )
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})
  await vi.advanceTimersByTimeAsync(0)

  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
  result.unmount()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
})

it('should apply changed interval settings while running', async () => {
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})
  await vi.advanceTimersByTimeAsync(0)
  window.dispatchEvent(
    new CustomEvent(RANDOM_EVENT_SETTINGS_CHANGED_EVENT, {
      detail: {maximumMinutes: 1, minimumMinutes: 1, version: 1},
    }),
  )

  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  result.unmount()
})

it('should apply a changed interval while earlier playback is still queued', async () => {
  await writeRandomEventSettings({maximumMinutes: 1, minimumMinutes: 1, version: 1})
  const playbackResolvers: Array<() => void> = []
  const onEvent = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        playbackResolvers.push(resolve)
      }),
  )
  const result = renderRandomEvent({onEvent, random: () => 0})
  await vi.advanceTimersByTimeAsync(0)
  await vi.advanceTimersByTimeAsync(60_000)
  window.dispatchEvent(
    new CustomEvent(RANDOM_EVENT_SETTINGS_CHANGED_EVENT, {
      detail: {maximumMinutes: 2, minimumMinutes: 2, version: 1},
    }),
  )

  await vi.advanceTimersByTimeAsync(2 * 60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
  playbackResolvers.forEach((resolve) => resolve())
  result.unmount()
})
