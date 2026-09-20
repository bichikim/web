/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useVolumeDucking} from 'src/components/dialogue-settings/use-volume-ducking'
import {
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  type DialogueVolumeDuckingSettings,
  usePlayerVolumeDucking,
} from 'src/features/focus-room-dialogue'
import {webLocalStorage} from 'src/utils/preference-storage'

const settingsMocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<DialogueVolumeDuckingSettings>>(),
  write: vi.fn<(settings: DialogueVolumeDuckingSettings) => Promise<void>>(),
}))

vi.mock('src/features/focus-room-dialogue', async () => {
  const actual: typeof import('src/features/focus-room-dialogue') = await vi.importActual(
    'src/features/focus-room-dialogue',
  )

  return {
    ...actual,
    createDialogueVolumeDuckingPreferenceOptions: (options = {}) => ({
      ...actual.createDialogueVolumeDuckingPreferenceOptions(options),
      storage: {
        read: () => settingsMocks.read(),
        subscribe: webLocalStorage.subscribe,
        write: (_key: string, value: unknown) => {
          const settings = actual.parseDialogueVolumeDuckingSettings(value)
          return settings === null
            ? new Error('Invalid test settings.')
            : settingsMocks.write(settings)
        },
      },
    }),
  }
})

beforeEach(() => {
  settingsMocks.read.mockResolvedValue(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
  settingsMocks.write.mockResolvedValue(undefined)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

it('should apply the edited ducking volume to playback before debounced persistence', async () => {
  const onGainChange = vi.fn()
  const view = renderHook(
    () => {
      const [isDialogueActive, setDialogueActive] = createSignal(false)
      const ducking = useVolumeDucking()
      usePlayerVolumeDucking({isDialogueActive, onGainChange})
      return {ducking, setDialogueActive}
    },
    {wrapper: PreferenceProvider},
  )

  await vi.advanceTimersByTimeAsync(0)
  onGainChange.mockClear()

  view.result.ducking.changeVolume(10)
  expect(view.result.ducking.settings().playerVolumePercent).toBe(10)

  view.result.setDialogueActive(true)

  expect(onGainChange).toHaveBeenLastCalledWith(0.1)
  view.cleanup()
})
