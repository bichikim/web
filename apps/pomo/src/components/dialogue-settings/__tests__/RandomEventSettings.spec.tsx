/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  type RandomEventSettings as RandomEventSettingsValue,
} from 'src/features/focus-room-dialogue'
import {webLocalStorage} from 'src/utils/preference-storage/web-local-storage'
import {RandomEventSettings} from '../RandomEventSettings'

const settingsMocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<RandomEventSettingsValue>>(),
  write: vi.fn<(settings: unknown) => Promise<void>>(),
}))

vi.mock('src/features/focus-room-dialogue', async () => {
  const actual: typeof import('src/features/focus-room-dialogue') = await vi.importActual(
    'src/features/focus-room-dialogue',
  )

  return {
    ...actual,
    createRandomEventPreferenceOptions: (options = {}) => ({
      ...actual.createRandomEventPreferenceOptions(options),
      storage: {
        read: () => settingsMocks.read(),
        subscribe: webLocalStorage.subscribe,
        write: (_key: string, value: unknown) => settingsMocks.write(value),
      },
    }),
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
  vi.stubGlobal('reportError', vi.fn())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('should save a valid interval after changes remain idle for 500 milliseconds', async () => {
  render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
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

it('should support arrow controls for the minimum interval', async () => {
  render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  const minimumInput = screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'})
  expect(minimumInput).toHaveClass('h-auto', 'py-2')

  fireEvent.click(screen.getByRole('button', {name: '랜덤 이벤트 최소 간격 줄이기'}))
  await vi.advanceTimersByTimeAsync(500)

  expect(settingsMocks.write).toHaveBeenCalledWith({
    ...DEFAULT_RANDOM_EVENT_SETTINGS,
    minimumMinutes: DEFAULT_RANDOM_EVENT_SETTINGS.minimumMinutes - 1,
  })
})

it('should cancel a pending save when the interval becomes invalid', async () => {
  render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
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
  const result = render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
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

it('should restore the persisted interval after an automatic save failure', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.write.mockRejectedValue(new Error('Storage unavailable'))
  render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  const minimumInput = screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'})
  fireEvent.input(minimumInput, {
    target: {value: '12'},
  })
  await vi.advanceTimersByTimeAsync(500)

  expect(screen.getByRole('status').textContent).toBe('랜덤 이벤트 설정을 저장하지 못했어요.')
  expect(minimumInput).toHaveValue(DEFAULT_RANDOM_EVENT_SETTINGS.minimumMinutes)
  expect(consoleError).toHaveBeenCalledOnce()
})

it('should report a load failure after a successful edit when settings reload', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  const minimumInput = screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'})
  fireEvent.input(minimumInput, {target: {value: '12'}})
  await vi.advanceTimersByTimeAsync(500)

  expect(settingsMocks.write).toHaveBeenCalledOnce()
  expect(minimumInput).toHaveValue(12)

  const reloadFailure = new Error('Storage unavailable on reload')
  settingsMocks.read.mockRejectedValueOnce(reloadFailure)
  globalThis.dispatchEvent(
    new StorageEvent('storage', {
      key: 'pomo:random-event-settings:v1',
      storageArea: globalThis.localStorage,
    }),
  )
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByRole('status')).toHaveTextContent('랜덤 이벤트 설정을 불러오지 못했어요.')
  expect(minimumInput).toHaveValue(12)
  expect(consoleError).toHaveBeenCalledWith('Failed to load random event settings.', reloadFailure)
})

it('should keep a save failure classification while a later edit is pending', async () => {
  const firstWrite = createDeferred<void>()
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.write.mockReturnValueOnce(firstWrite.promise)
  render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  const minimumInput = screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'})
  fireEvent.input(minimumInput, {target: {value: '12'}})
  await vi.advanceTimersByTimeAsync(500)
  fireEvent.input(minimumInput, {target: {value: '13'}})
  firstWrite.resolve()
  await vi.advanceTimersByTimeAsync(0)

  const reloadFailure = new Error('Storage unavailable on reload')
  settingsMocks.read.mockRejectedValueOnce(reloadFailure)
  globalThis.dispatchEvent(
    new StorageEvent('storage', {
      key: 'pomo:random-event-settings:v1',
      storageArea: globalThis.localStorage,
    }),
  )
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByRole('status')).toHaveTextContent('랜덤 이벤트 설정을 저장하지 못했어요.')
  expect(minimumInput).toHaveValue(DEFAULT_RANDOM_EVENT_SETTINGS.minimumMinutes)
  expect(consoleError).toHaveBeenCalledWith('Failed to save random event settings.', reloadFailure)
})

it('should report a failure for a later write queued behind an earlier save', async () => {
  const firstWrite = createDeferred<void>()
  const secondWrite = createDeferred<void>()
  const saveFailure = new Error('Storage unavailable on the later save')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.write
    .mockReturnValueOnce(firstWrite.promise)
    .mockReturnValueOnce(secondWrite.promise)
  render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  const minimumInput = screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'})
  fireEvent.input(minimumInput, {target: {value: '12'}})
  await vi.advanceTimersByTimeAsync(500)
  fireEvent.input(minimumInput, {target: {value: '13'}})
  await vi.advanceTimersByTimeAsync(500)

  expect(settingsMocks.write).toHaveBeenCalledOnce()
  firstWrite.resolve()
  await vi.advanceTimersByTimeAsync(0)

  expect(settingsMocks.write).toHaveBeenCalledTimes(2)
  secondWrite.reject(saveFailure)
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByRole('status')).toHaveTextContent('랜덤 이벤트 설정을 저장하지 못했어요.')
  expect(minimumInput).toHaveValue(12)
  expect(consoleError).toHaveBeenCalledWith('Failed to save random event settings.', saveFailure)
})

it('should report a loading failure after enabling interval inputs', async () => {
  const failure = new Error('Storage unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.read.mockRejectedValue(failure)

  render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByRole('status')).toHaveTextContent('랜덤 이벤트 설정을 불러오지 못했어요.')
  expect(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'})).toBeEnabled()
  expect(consoleError).toHaveBeenCalledWith('Failed to load random event settings.', failure)
})

it('should ignore a late settings load after disposal', async () => {
  const deferred = createDeferred<RandomEventSettingsValue>()
  settingsMocks.read.mockReturnValue(deferred.promise)
  const result = render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})

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
  const result = render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})

  result.unmount()
  deferred.reject(failure)
  await vi.advanceTimersByTimeAsync(0)

  expect(consoleError).not.toHaveBeenCalled()
})

it('should avoid showing a save error after disposal during an in-flight save', async () => {
  const deferred = createDeferred<void>()
  const failure = new Error('Storage unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.write.mockReturnValue(deferred.promise)
  const result = render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  fireEvent.input(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'}), {
    target: {value: '12'},
  })
  await vi.advanceTimersByTimeAsync(500)
  result.unmount()
  deferred.reject(failure)
  await vi.advanceTimersByTimeAsync(0)

  expect(consoleError).not.toHaveBeenCalled()
})
