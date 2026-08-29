/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  RANDOM_EVENT_SETTINGS_CHANGED_EVENT,
  readRandomEventSettings,
  writeRandomEventSettings,
} from '../random-event-settings'
import {getRandomEventDelay, useRandomEvent, type UseRandomEventProps} from '../use-random-event'

vi.mock('../random-event-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../random-event-settings')>()

  return {
    ...actual,
    readRandomEventSettings: vi.fn(actual.readRandomEventSettings),
  }
})

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

it('should wait for earlier playback before scheduling another random event', async () => {
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
  await vi.advanceTimersByTimeAsync(4 * 60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  playbackResolvers[0]?.()
  await vi.advanceTimersByTimeAsync(2 * 60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
  playbackResolvers[1]?.()
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
  window.dispatchEvent(new Event(RANDOM_EVENT_SETTINGS_CHANGED_EVENT))
  window.dispatchEvent(
    new CustomEvent(RANDOM_EVENT_SETTINGS_CHANGED_EVENT, {
      detail: {maximumMinutes: 0, minimumMinutes: 2, version: 1},
    }),
  )
  window.dispatchEvent(
    new CustomEvent(RANDOM_EVENT_SETTINGS_CHANGED_EVENT, {
      detail: {maximumMinutes: 1, minimumMinutes: 1, version: 1},
    }),
  )

  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  result.unmount()
})

it('should apply a changed interval after earlier playback completes', async () => {
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
  expect(onEvent).toHaveBeenCalledOnce()
  playbackResolvers[0]?.()
  await vi.advanceTimersByTimeAsync(2 * 60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
  playbackResolvers[1]?.()
  result.unmount()
})

it('should preserve newer event settings when an older storage read completes', async () => {
  let resolveSettings: (settings: {
    readonly maximumMinutes: number
    readonly minimumMinutes: number
    readonly version: 1
  }) => void = () => undefined
  const settingsPromise = new Promise<{
    readonly maximumMinutes: number
    readonly minimumMinutes: number
    readonly version: 1
  }>((resolve) => {
    resolveSettings = resolve
  })
  vi.mocked(readRandomEventSettings).mockReturnValueOnce(settingsPromise)
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})

  window.dispatchEvent(
    new CustomEvent(RANDOM_EVENT_SETTINGS_CHANGED_EVENT, {
      detail: {maximumMinutes: 1, minimumMinutes: 1, version: 1},
    }),
  )
  resolveSettings({maximumMinutes: 20, minimumMinutes: 20, version: 1})
  await vi.advanceTimersByTimeAsync(0)

  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  result.unmount()
})

it('should become ready with defaults when loading settings rejects', async () => {
  const error = new Error('settings unavailable')
  vi.mocked(readRandomEventSettings).mockRejectedValueOnce(error)
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})

  await vi.advanceTimersByTimeAsync(10 * 60_000)

  expect(consoleError).toHaveBeenCalledWith('Failed to load random event settings.', error)
  expect(onEvent).toHaveBeenCalledOnce()
  result.unmount()
})

it('should not become ready when loading settings rejects after unmount', async () => {
  let rejectSettings: (error: unknown) => void = () => undefined
  const settingsPromise = new Promise<never>((_resolve, reject) => {
    rejectSettings = reject
  })
  vi.mocked(readRandomEventSettings).mockReturnValueOnce(settingsPromise)
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})
  const error = new Error('late settings failure')

  result.unmount()
  rejectSettings(error)
  await vi.advanceTimersByTimeAsync(0)

  expect(consoleError).toHaveBeenCalledWith('Failed to load random event settings.', error)
  expect(onEvent).not.toHaveBeenCalled()
})

it('should report a rejected event and continue scheduling', async () => {
  const error = new Error('queue failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const onEvent = vi.fn().mockRejectedValue(error)
  const result = renderRandomEvent({onEvent, random: () => 0})
  await vi.advanceTimersByTimeAsync(0)

  await vi.advanceTimersByTimeAsync(10 * 60_000)

  expect(consoleError).toHaveBeenCalledWith('Failed to queue a random dialogue event.', error)
  expect(onEvent).toHaveBeenCalledOnce()

  await vi.advanceTimersByTimeAsync(10 * 60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
  result.unmount()
})
