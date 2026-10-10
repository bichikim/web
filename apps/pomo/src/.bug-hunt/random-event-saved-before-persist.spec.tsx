/** @vitest-environment jsdom */

import {createDeferred} from 'src/test-utils/create-deferred'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  type RandomEventSettings as RandomEventSettingsValue,
} from 'src/features/focus-room-dialogue/random-event-settings'
import {webLocalStorage} from 'src/utils/preference-storage/web-local-storage'
import {RandomEventSettings} from '../components/dialogue-settings/RandomEventSettings'

const settingsMocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<RandomEventSettingsValue>>(),
  write: vi.fn<(settings: unknown) => Promise<void>>(),
}))

vi.mock('src/features/focus-room-dialogue', async () => {
  const actual: typeof import('src/features/focus-room-dialogue/random-event-settings') =
    await vi.importActual('src/features/focus-room-dialogue/random-event-settings')

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
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

it('should not show the saved message before preference persistence finishes', async () => {
  const pendingWrite = createDeferred<void>()
  settingsMocks.write.mockReturnValueOnce(pendingWrite.promise)

  render(() => <RandomEventSettings />, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  fireEvent.input(screen.getByRole('spinbutton', {name: '랜덤 이벤트 최소 간격(분)'}), {
    target: {value: '12'},
  })
  await vi.advanceTimersByTimeAsync(500)

  expect(settingsMocks.write).toHaveBeenCalledOnce()
  expect(screen.queryByText('랜덤 이벤트 설정을 저장했어요.')).toBeNull()

  pendingWrite.resolve()
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByText('랜덤 이벤트 설정을 저장했어요.')).toBeInTheDocument()
})
