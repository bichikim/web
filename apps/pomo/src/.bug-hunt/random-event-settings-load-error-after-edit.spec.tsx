/** @vitest-environment jsdom */
/** @jsxImportSource solid-js */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  type RandomEventSettings as RandomEventSettingsValue,
} from 'src/features/focus-room-dialogue'
import {webLocalStorage} from 'src/utils/preference-storage/web-local-storage'
import {RandomEventSettings} from '../components/dialogue-settings/RandomEventSettings'

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

it('should report a load failure after a successful edit even when settings were saved', async () => {
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

  expect(screen.getByRole('status').textContent).toBe('랜덤 이벤트 설정을 불러오지 못했어요.')
  expect(minimumInput).toHaveValue(12)
  expect(consoleError).toHaveBeenCalledWith('Failed to load random event settings.', reloadFailure)
})
