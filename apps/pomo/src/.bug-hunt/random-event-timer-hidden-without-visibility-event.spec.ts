/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {PreferenceProvider, usePreference} from 'src/hooks/use-preference'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createRandomEventPreferenceOptions,
  type RandomEventSettings,
} from '../features/focus-room-dialogue/random-event-settings'
import {useRandomEvent, type UseRandomEventProps} from '../features/focus-room-dialogue/use-random-event'

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

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), setItem: vi.fn()},
}))

let documentHidden = false

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
  settingsMocks.read.mockResolvedValue({maximumMinutes: 1, minimumMinutes: 1, version: 1})
  settingsMocks.write.mockResolvedValue(undefined)
  documentHidden = false
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => documentHidden)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('should reschedule when a timer fires while document.hidden is true without a visibility event', async () => {
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
