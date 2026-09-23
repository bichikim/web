/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {PreferenceProvider, usePreference} from 'src/hooks/use-preference'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createRandomEventPreferenceOptions,
  type RandomEventSettings,
} from '../random-event-settings'
import {getRandomEventDelay, useRandomEvent, type UseRandomEventProps} from '../use-random-event'

const settingsMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../random-event-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../random-event-settings')>()

  return {
    ...actual,
    createRandomEventPreferenceOptions: (options = {}) => ({
      ...actual.createRandomEventPreferenceOptions(options),
      storage: {
        read: () => settingsMocks.read(),
        write: (_key: string, value: unknown) => settingsMocks.write(value),
      },
    }),
  }
})

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), setItem: vi.fn()},
}))

let documentHidden = false

const changeVisibility = (hidden: boolean) => {
  documentHidden = hidden
  document.dispatchEvent(new Event('visibilitychange'))
}

const renderRandomEvent = (props: UseRandomEventProps) => {
  let setSettings: (settings: RandomEventSettings) => void = () => undefined
  const view = render(
    () => {
      const [, setPreference] = usePreference(createRandomEventPreferenceOptions())
      setSettings = setPreference
      useRandomEvent(props)
      return null
    },
    {wrapper: PreferenceProvider},
  )
  return {setSettings, view}
}

beforeEach(() => {
  localStorage.clear()
  settingsMocks.read.mockResolvedValue({maximumMinutes: 20, minimumMinutes: 10, version: 1})
  settingsMocks.write.mockResolvedValue(undefined)
  documentHidden = false
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => documentHidden)
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

it('should pause scheduling while the document is hidden', async () => {
  settingsMocks.read.mockResolvedValue({maximumMinutes: 1, minimumMinutes: 1, version: 1})
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})
  await vi.advanceTimersByTimeAsync(0)

  changeVisibility(true)
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).not.toHaveBeenCalled()

  changeVisibility(false)
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  result.view.unmount()
})

it('should wait for visibility before starting when initially hidden', async () => {
  documentHidden = true
  settingsMocks.read.mockResolvedValue({maximumMinutes: 1, minimumMinutes: 1, version: 1})
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})
  await vi.advanceTimersByTimeAsync(0)

  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).not.toHaveBeenCalled()

  changeVisibility(false)
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  result.view.unmount()
})

it('should reschedule when a random event timer fires while hidden without a visibility change', async () => {
  settingsMocks.read.mockResolvedValue({maximumMinutes: 1, minimumMinutes: 1, version: 1})
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})
  await vi.advanceTimersByTimeAsync(0)

  documentHidden = true
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).not.toHaveBeenCalled()

  documentHidden = false
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  result.view.unmount()
})

it('should wait for earlier playback before scheduling another random event', async () => {
  const settings = {maximumMinutes: 2, minimumMinutes: 2, version: 1} as const
  settingsMocks.read.mockResolvedValue(settings)
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
  result.view.unmount()
})

it('should keep scheduling without playback and stop after unmount', async () => {
  settingsMocks.read.mockResolvedValue({maximumMinutes: 1, minimumMinutes: 1, version: 1})
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})
  await vi.advanceTimersByTimeAsync(0)

  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
  result.view.unmount()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
})

it('should apply changed interval settings while running', async () => {
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})
  await vi.advanceTimersByTimeAsync(0)
  result.setSettings({maximumMinutes: 1, minimumMinutes: 1, version: 1})

  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  result.view.unmount()
})

it('should apply a changed interval after earlier playback completes', async () => {
  settingsMocks.read.mockResolvedValue({maximumMinutes: 1, minimumMinutes: 1, version: 1})
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
  result.setSettings({maximumMinutes: 2, minimumMinutes: 2, version: 1})

  await vi.advanceTimersByTimeAsync(2 * 60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  playbackResolvers[0]?.()
  await vi.advanceTimersByTimeAsync(2 * 60_000)
  expect(onEvent).toHaveBeenCalledTimes(2)
  playbackResolvers[1]?.()
  result.view.unmount()
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
  settingsMocks.read.mockReturnValueOnce(settingsPromise)
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})

  result.setSettings({maximumMinutes: 1, minimumMinutes: 1, version: 1})
  resolveSettings({maximumMinutes: 20, minimumMinutes: 20, version: 1})
  await vi.advanceTimersByTimeAsync(0)

  await vi.advanceTimersByTimeAsync(60_000)
  expect(onEvent).toHaveBeenCalledOnce()
  result.view.unmount()
})

it('should become ready with defaults when loading settings rejects', async () => {
  const error = new Error('settings unavailable')
  settingsMocks.read.mockRejectedValueOnce(error)
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})

  await vi.advanceTimersByTimeAsync(10 * 60_000)

  expect(consoleError).toHaveBeenCalledWith('Failed to load random event settings.', error)
  expect(onEvent).toHaveBeenCalledOnce()
  result.view.unmount()
})

it('should not become ready when loading settings rejects after unmount', async () => {
  let rejectSettings: (error: unknown) => void = () => undefined
  const settingsPromise = new Promise<never>((_resolve, reject) => {
    rejectSettings = reject
  })
  settingsMocks.read.mockReturnValueOnce(settingsPromise)
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const onEvent = vi.fn()
  const result = renderRandomEvent({onEvent, random: () => 0})
  const error = new Error('late settings failure')

  result.view.unmount()
  rejectSettings(error)
  await vi.advanceTimersByTimeAsync(0)

  expect(consoleError).not.toHaveBeenCalled()
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
  result.view.unmount()
})
