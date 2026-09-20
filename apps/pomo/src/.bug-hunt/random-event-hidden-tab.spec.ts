/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {PreferenceProvider, usePreference} from 'src/hooks/use-preference'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createRandomEventPreferenceOptions,
  type RandomEventSettings,
} from '../features/focus-room-dialogue/random-event-settings'
import {useRandomEvent} from '../features/focus-room-dialogue/use-random-event'

const settingsMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../features/focus-room-dialogue/random-event-settings', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../features/focus-room-dialogue/random-event-settings')>()

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

beforeEach(() => {
  settingsMocks.read.mockResolvedValue({maximumMinutes: 1, minimumMinutes: 1, version: 1})
  settingsMocks.write.mockResolvedValue(undefined)
  vi.useFakeTimers()
  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'})
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(document, 'visibilityState')
})

it('should not queue random dialogue events while the document is hidden', async () => {
  const onEvent = vi.fn()
  render(
    () => {
      usePreference(createRandomEventPreferenceOptions())
      useRandomEvent({onEvent, random: () => 0})
      return null
    },
    {wrapper: PreferenceProvider},
  )

  await vi.advanceTimersByTimeAsync(60_000)

  expect(onEvent).not.toHaveBeenCalled()
})
