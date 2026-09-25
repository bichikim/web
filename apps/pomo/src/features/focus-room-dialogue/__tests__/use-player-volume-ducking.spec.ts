/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {PreferenceProvider, usePreference} from 'src/hooks/use-preference'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createDialogueVolumeDuckingPreferenceOptions,
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  type DialogueVolumeDuckingSettings,
} from '../volume-ducking-settings'
import {useVolumeDucking} from 'src/components/dialogue-settings/use-volume-ducking'
import {resolveDialoguePlayerGain, usePlayerVolumeDucking} from '../use-player-volume-ducking'

const settingsMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../volume-ducking-settings', async () => {
  const actual: typeof import('../volume-ducking-settings') = await vi.importActual(
    '../volume-ducking-settings',
  )

  return {
    ...actual,
    createDialogueVolumeDuckingPreferenceOptions: (options = {}) => ({
      ...actual.createDialogueVolumeDuckingPreferenceOptions(options),
      storage: {
        read: () => settingsMocks.read(),
        write: () => settingsMocks.write(),
      },
    }),
  }
})

beforeEach(() => {
  settingsMocks.read.mockResolvedValue(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
  settingsMocks.write.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should resolve full, configured, and muted player gains', () => {
  expect(resolveDialoguePlayerGain(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS, false)).toBe(1)
  expect(resolveDialoguePlayerGain(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS, true)).toBe(0.5)
  expect(
    resolveDialoguePlayerGain({enabled: true, playerVolumePercent: 10, version: 2}, true),
  ).toBe(0.1)
  expect(resolveDialoguePlayerGain({enabled: true, playerVolumePercent: 0, version: 2}, true)).toBe(
    0,
  )
  expect(
    resolveDialoguePlayerGain({enabled: false, playerVolumePercent: 0, version: 2}, true),
  ).toBe(1)
})

it('should react to dialogue playback and live setting changes', async () => {
  const onGainChange = vi.fn()
  let setDialogueActive: (active: boolean) => void = () => undefined
  let setSettings: (settings: DialogueVolumeDuckingSettings) => void = () => undefined

  const view = renderHook(
    () => {
      const [isDialogueActive, setActive] = createSignal(false)
      setDialogueActive = setActive
      const [, setPreference] = usePreference(createDialogueVolumeDuckingPreferenceOptions())
      setSettings = setPreference
      usePlayerVolumeDucking({isDialogueActive, onGainChange})
    },
    {wrapper: PreferenceProvider},
  )
  await Promise.resolve()

  expect(onGainChange).toHaveBeenLastCalledWith(1)

  setDialogueActive(true)
  expect(onGainChange).toHaveBeenLastCalledWith(0.5)

  setSettings({enabled: true, playerVolumePercent: 35, version: 2})
  expect(onGainChange).toHaveBeenLastCalledWith(0.35)

  setSettings({enabled: false, playerVolumePercent: 35, version: 2})
  expect(onGainChange).toHaveBeenLastCalledWith(1)
  view.cleanup()
})

it('should apply a settings edit before its debounced save completes', async () => {
  vi.useFakeTimers()
  let changeVolume: (playerVolumePercent: number) => void = () => undefined
  const onGainChange = vi.fn()
  const view = renderHook(
    () => {
      const settings = useVolumeDucking()
      changeVolume = settings.changeVolume
      usePlayerVolumeDucking({isDialogueActive: () => true, onGainChange})
    },
    {wrapper: PreferenceProvider},
  )
  try {
    await vi.advanceTimersByTimeAsync(0)
    settingsMocks.write.mockClear()

    changeVolume(10)

    expect(onGainChange).toHaveBeenLastCalledWith(0.1)
    expect(settingsMocks.write).not.toHaveBeenCalled()
  } finally {
    view.cleanup()
    vi.useRealTimers()
  }
})

it('should not track signals read by the gain callback', async () => {
  const onGainChange = vi.fn()
  let setCallbackState: (value: number) => void = () => undefined
  const view = renderHook(
    () => {
      const [callbackState, setState] = createSignal(0)
      setCallbackState = setState
      usePlayerVolumeDucking({
        isDialogueActive: () => true,
        onGainChange: (gain) => {
          callbackState()
          onGainChange(gain)
        },
      })
    },
    {wrapper: PreferenceProvider},
  )
  await Promise.resolve()

  const callCountAfterRestore = onGainChange.mock.calls.length
  expect(callCountAfterRestore).toBeGreaterThan(0)
  setCallbackState(1)
  await Promise.resolve()

  expect(onGainChange).toHaveBeenCalledTimes(callCountAfterRestore)
  view.cleanup()
})

it('should not let a late settings read replace a newer live change', async () => {
  let resolveRead: (settings: typeof DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS) => void = () =>
    undefined
  settingsMocks.read.mockReturnValue(
    new Promise((resolve) => {
      resolveRead = resolve
    }),
  )
  const onGainChange = vi.fn()
  let setSettings: (settings: DialogueVolumeDuckingSettings) => void = () => undefined
  const view = renderHook(
    () => {
      const [, setPreference] = usePreference(createDialogueVolumeDuckingPreferenceOptions())
      setSettings = setPreference
      usePlayerVolumeDucking({isDialogueActive: () => true, onGainChange})
    },
    {wrapper: PreferenceProvider},
  )
  await Promise.resolve()

  setSettings({enabled: true, playerVolumePercent: 20, version: 2})
  resolveRead(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
  await Promise.resolve()

  expect(onGainChange).toHaveBeenLastCalledWith(0.2)
  view.cleanup()
})

it('should report settings read failures', async () => {
  const failure = new Error('read failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.read.mockRejectedValueOnce(failure)
  const onGainChange = vi.fn()
  const view = renderHook(
    () => usePlayerVolumeDucking({isDialogueActive: () => true, onGainChange}),
    {wrapper: PreferenceProvider},
  )
  await Promise.resolve()
  await Promise.resolve()

  expect(onGainChange).toHaveBeenLastCalledWith(0.5)
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to load dialogue volume ducking settings.',
    failure,
  )
  view.cleanup()
})

it('should ignore a settings read completed after disposal', async () => {
  let resolveRead: (settings: typeof DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS) => void = () =>
    undefined
  settingsMocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveRead = resolve
    }),
  )
  const onGainChange = vi.fn()
  const view = renderHook(
    () => usePlayerVolumeDucking({isDialogueActive: () => true, onGainChange}),
    {wrapper: PreferenceProvider},
  )
  view.cleanup()
  resolveRead(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
  await Promise.resolve()

  expect(onGainChange).toHaveBeenCalledOnce()
})
