/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  type RandomEventSettings as RandomEventSettingsValue,
} from 'src/features/focus-room-dialogue'
import {RandomEventSettings} from '../RandomEventSettings'

const settingsMocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<RandomEventSettingsValue>>(),
  write: vi.fn<(settings: RandomEventSettingsValue) => Promise<void>>(),
}))

vi.mock('src/features/focus-room-dialogue', async () => {
  const actual: typeof import('src/features/focus-room-dialogue') = await vi.importActual(
    'src/features/focus-room-dialogue',
  )

  return {
    ...actual,
    readRandomEventSettings: settingsMocks.read,
    writeRandomEventSettings: settingsMocks.write,
  }
})

function createDeferred<T>() {
  let reject: (reason?: unknown) => void = () => undefined
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return {promise, reject, resolve}
}

beforeEach(() => {
  settingsMocks.read.mockResolvedValue(DEFAULT_RANDOM_EVENT_SETTINGS)
  settingsMocks.write.mockResolvedValue(undefined)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

it('should save a valid interval after changes remain idle for 500 milliseconds', async () => {
  render(() => <RandomEventSettings />)
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.queryByRole('button', {name: '간격 저장'})).toBeNull()
  expect(screen.queryByRole('switch', {name: '랜덤 이벤트 사용'})).toBeNull()

  fireEvent.input(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'}), {
    target: {value: '12'},
  })
  fireEvent.input(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최대 간격(분)'}), {
    target: {value: '24'},
  })

  await vi.advanceTimersByTimeAsync(499)
  expect(settingsMocks.write).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(1)
  expect(settingsMocks.write).toHaveBeenCalledOnce()
  expect(settingsMocks.write).toHaveBeenCalledWith({
    ...DEFAULT_RANDOM_EVENT_SETTINGS,
    maximumMinutes: 24,
    minimumMinutes: 12,
  })
})

it('should cancel a pending save when the interval becomes invalid', async () => {
  render(() => <RandomEventSettings />)
  await vi.advanceTimersByTimeAsync(0)

  fireEvent.input(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'}), {
    target: {value: '15'},
  })
  fireEvent.input(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최대 간격(분)'}), {
    target: {value: '10'},
  })
  await vi.advanceTimersByTimeAsync(500)

  expect(settingsMocks.write).not.toHaveBeenCalled()
  expect(
    screen
      .getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'})
      .getAttribute('aria-invalid'),
  ).toBe('true')
  expect(screen.getByRole('status').textContent).toContain('최소 간격은 최대 간격보다')
})

it('should flush a pending valid interval when the settings unmount', async () => {
  const result = render(() => <RandomEventSettings />)
  await vi.advanceTimersByTimeAsync(0)
  fireEvent.input(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'}), {
    target: {value: '12'},
  })

  result.unmount()
  await vi.advanceTimersByTimeAsync(500)

  expect(settingsMocks.write).toHaveBeenCalledWith({
    ...DEFAULT_RANDOM_EVENT_SETTINGS,
    minimumMinutes: 12,
  })
})

it('should report an automatic save failure', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.write.mockRejectedValue(new Error('Storage unavailable'))
  render(() => <RandomEventSettings />)
  await vi.advanceTimersByTimeAsync(0)

  fireEvent.input(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'}), {
    target: {value: '12'},
  })
  await vi.advanceTimersByTimeAsync(500)

  expect(screen.getByRole('status').textContent).toBe('랜덤 이벤트 설정을 저장하지 못했어요.')
  expect(consoleError).toHaveBeenCalledOnce()
})

it('should report a loading failure after enabling interval inputs', async () => {
  const failure = new Error('Storage unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.read.mockRejectedValue(failure)

  render(() => <RandomEventSettings />)
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByRole('status')).toHaveTextContent('랜덤 이벤트 설정을 불러오지 못했어요.')
  expect(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'})).toBeEnabled()
  expect(consoleError).toHaveBeenCalledWith('Failed to load random event settings.', failure)
})

it('should ignore a late settings load after disposal', async () => {
  const deferred = createDeferred<RandomEventSettingsValue>()
  settingsMocks.read.mockReturnValue(deferred.promise)
  const result = render(() => <RandomEventSettings />)

  result.unmount()
  deferred.resolve({...DEFAULT_RANDOM_EVENT_SETTINGS, minimumMinutes: 12})
  await vi.advanceTimersByTimeAsync(0)

  expect(settingsMocks.write).not.toHaveBeenCalled()
})

it('should ignore a late settings load failure after disposal', async () => {
  const deferred = createDeferred<RandomEventSettingsValue>()
  const failure = new Error('Storage unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.read.mockReturnValue(deferred.promise)
  const result = render(() => <RandomEventSettings />)

  result.unmount()
  deferred.reject(failure)
  await vi.advanceTimersByTimeAsync(0)

  expect(consoleError).toHaveBeenCalledWith('Failed to load random event settings.', failure)
})

it('should avoid showing a save error after disposal during an in-flight save', async () => {
  const deferred = createDeferred<void>()
  const failure = new Error('Storage unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.write.mockReturnValue(deferred.promise)
  const result = render(() => <RandomEventSettings />)
  await vi.advanceTimersByTimeAsync(0)

  fireEvent.input(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'}), {
    target: {value: '12'},
  })
  await vi.advanceTimersByTimeAsync(500)
  result.unmount()
  deferred.reject(failure)
  await vi.advanceTimersByTimeAsync(0)

  expect(consoleError).toHaveBeenCalledWith('Failed to save random event settings.', failure)
})
