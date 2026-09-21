/** @vitest-environment jsdom */

import {PreferenceProvider, usePreference} from 'src/hooks/use-preference'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createDialogueVolumeDuckingPreferenceOptions,
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  type DialogueVolumeDuckingSettings as DialogueVolumeDuckingSettingsValue,
} from 'src/features/focus-room-dialogue'
import {resolveDialoguePlayerGain} from 'src/features/focus-room-dialogue/use-player-volume-ducking'
import {webLocalStorage} from 'src/utils/preference-storage'
import {useVolumeDucking} from '../use-volume-ducking'

const settingsMocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<DialogueVolumeDuckingSettingsValue>>(),
  write: vi.fn<(settings: DialogueVolumeDuckingSettingsValue) => Promise<void>>(),
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
  vi.stubGlobal('reportError', vi.fn())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('should flush a pending change when the settings unmount', async () => {
  const view = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  view.result.changeVolume(72)
  view.cleanup()
  await vi.advanceTimersByTimeAsync(0)

  expect(settingsMocks.write).toHaveBeenCalledWith({
    enabled: true,
    playerVolumePercent: 72,
    version: 2,
  })
})

it('should restore the saved settings after a save failure', async () => {
  const loadFailure = new Error('load failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.read.mockRejectedValueOnce(loadFailure)
  const view = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  expect(view.result.message()).toBe('플레이어 음량 설정을 불러오지 못했어요.')
  expect(view.result.isLoading()).toBe(false)
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to load dialogue volume ducking settings.',
    loadFailure,
  )

  settingsMocks.write.mockRejectedValueOnce(new Error('save failed'))
  view.result.changeEnabled(false)
  await vi.advanceTimersByTimeAsync(300)
  await vi.advanceTimersByTimeAsync(0)

  expect(view.result.message()).toBe('플레이어 음량 설정을 저장하지 못했어요.')
  expect(view.result.settings().enabled).toBe(true)
})

it('should report a later reload failure as a load failure after a successful edit', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const view = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  view.result.changeVolume(72)
  await vi.advanceTimersByTimeAsync(300)
  await vi.advanceTimersByTimeAsync(0)

  expect(settingsMocks.write).toHaveBeenCalledOnce()

  const reloadFailure = new Error('reload failed')
  settingsMocks.read.mockRejectedValueOnce(reloadFailure)
  globalThis.dispatchEvent(
    new StorageEvent('storage', {
      key: 'pomo:dialogue-volume-ducking-settings:v2',
      storageArea: globalThis.localStorage,
    }),
  )
  await vi.advanceTimersByTimeAsync(0)

  expect(view.result.message()).toBe('플레이어 음량 설정을 불러오지 못했어요.')
  expect(view.result.settings().playerVolumePercent).toBe(72)
  expect(consoleError).toHaveBeenLastCalledWith(
    'Failed to load dialogue volume ducking settings.',
    reloadFailure,
  )
  view.cleanup()
})

it('should report a queued save failure as a save failure after an earlier save succeeds', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const firstWrite = Promise.withResolvers<void>()
  const secondWrite = Promise.withResolvers<void>()
  settingsMocks.write
    .mockReturnValueOnce(firstWrite.promise)
    .mockReturnValueOnce(secondWrite.promise)
  const view = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  view.result.changeVolume(35)
  await vi.advanceTimersByTimeAsync(300)
  view.result.changeVolume(40)
  await vi.advanceTimersByTimeAsync(300)

  expect(settingsMocks.write).toHaveBeenCalledOnce()

  firstWrite.resolve()
  await vi.advanceTimersByTimeAsync(0)
  expect(settingsMocks.write).toHaveBeenCalledTimes(2)

  const secondFailure = new Error('second save failed')
  secondWrite.reject(secondFailure)
  await vi.advanceTimersByTimeAsync(0)

  expect(view.result.message()).toBe('플레이어 음량 설정을 저장하지 못했어요.')
  expect(consoleError).toHaveBeenLastCalledWith(
    'Failed to save dialogue volume ducking settings.',
    secondFailure,
  )
  view.cleanup()
})

it('should clear an earlier save failure when the following save succeeds without success feedback', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const firstWrite = Promise.withResolvers<void>()
  const secondWrite = Promise.withResolvers<void>()
  settingsMocks.write
    .mockReturnValueOnce(firstWrite.promise)
    .mockReturnValueOnce(secondWrite.promise)
  const view = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)

  view.result.changeVolume(35)
  await vi.advanceTimersByTimeAsync(300)
  view.result.changeVolume(40)
  await vi.advanceTimersByTimeAsync(300)
  expect(settingsMocks.write).toHaveBeenCalledOnce()

  firstWrite.reject(new Error('first save failed'))
  await vi.advanceTimersByTimeAsync(0)
  expect(settingsMocks.write).toHaveBeenCalledTimes(2)
  expect(view.result.message()).toBe('플레이어 음량 설정을 저장하지 못했어요.')

  secondWrite.resolve()
  await vi.advanceTimersByTimeAsync(0)
  expect(view.result.message()).toBeNull()
  expect(view.result.settings().playerVolumePercent).toBe(40)
})

it('should ignore settings work completed after unmount', async () => {
  let resolveRead: (settings: DialogueVolumeDuckingSettingsValue) => void = () => undefined
  settingsMocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveRead = resolve
    }),
  )
  const first = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  first.cleanup()
  resolveRead({...DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS, playerVolumePercent: 15})
  await vi.advanceTimersByTimeAsync(0)

  let resolveWrite: () => void = () => undefined
  settingsMocks.write.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveWrite = resolve
    }),
  )
  const second = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)
  second.result.changeVolume(61)
  await vi.advanceTimersByTimeAsync(300)
  second.cleanup()
  resolveWrite()
  await vi.advanceTimersByTimeAsync(0)

  expect(first.result.isLoading()).toBe(true)
  expect(second.result.message()).toBeNull()
})

it('should ignore settings failures completed after unmount', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  let rejectRead: (error: Error) => void = () => undefined
  settingsMocks.read.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectRead = reject
    }),
  )
  const first = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  first.cleanup()
  rejectRead(new Error('late load failure'))
  await vi.advanceTimersByTimeAsync(0)

  let rejectWrite: (error: Error) => void = () => undefined
  settingsMocks.write.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectWrite = reject
    }),
  )
  const second = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)
  second.result.changeVolume(62)
  await vi.advanceTimersByTimeAsync(300)
  second.cleanup()
  rejectWrite(new Error('late save failure'))
  await vi.advanceTimersByTimeAsync(0)

  expect(first.result.message()).toBeNull()
  expect(second.result.message()).toBeNull()
  expect(consoleError).not.toHaveBeenCalled()
})

it('should keep a pending edit when initial restoration completes', async () => {
  let resolveRead: (settings: DialogueVolumeDuckingSettingsValue) => void = () => undefined
  settingsMocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveRead = resolve
    }),
  )
  const view = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})

  view.result.changeVolume(72)
  resolveRead({...DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS, playerVolumePercent: 20})
  await vi.advanceTimersByTimeAsync(0)

  expect(view.result.settings().playerVolumePercent).toBe(72)
  expect(settingsMocks.write).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(300)

  expect(settingsMocks.write).toHaveBeenCalledExactlyOnceWith({
    ...DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
    playerVolumePercent: 72,
  })
  view.cleanup()
})

it('should log a pending save failure after unmount', async () => {
  const failure = new Error('flush failed')
  const reportError = vi.fn()
  vi.stubGlobal('reportError', reportError)
  settingsMocks.write.mockRejectedValueOnce(failure)
  const view = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  await vi.advanceTimersByTimeAsync(0)
  view.result.changeVolume(63)

  view.cleanup()
  await vi.advanceTimersByTimeAsync(0)

  expect(reportError).toHaveBeenCalledWith(failure)
})

it('should restore settings and debounce storage while publishing changes immediately', async () => {
  const storedSettings = {...DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS, playerVolumePercent: 20}
  settingsMocks.read.mockResolvedValueOnce(storedSettings)
  const view = renderHook(useVolumeDucking, {wrapper: PreferenceProvider})
  expect(view.result.isLoading()).toBe(true)
  await vi.advanceTimersByTimeAsync(0)
  expect(view.result.isLoading()).toBe(false)
  expect(view.result.settings()).toEqual(storedSettings)

  view.result.changeVolume(37)
  await vi.advanceTimersByTimeAsync(299)
  expect(settingsMocks.write).not.toHaveBeenCalled()
  view.result.changeVolume(38)
  view.result.changeEnabled(false)
  const expectedSettings = {...storedSettings, enabled: false, playerVolumePercent: 38}
  expect(view.result.settings()).toEqual(expectedSettings)
  await vi.advanceTimersByTimeAsync(299)
  expect(settingsMocks.write).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(settingsMocks.write).toHaveBeenCalledExactlyOnceWith(expectedSettings)
  expect(view.result.message()).toBeNull()
  view.cleanup()
  await vi.advanceTimersByTimeAsync(300)
  expect(settingsMocks.write).toHaveBeenCalledTimes(1)
})

it('should publish edited settings to player gain consumers before the save debounce', async () => {
  const view = renderHook(
    () => {
      const settings = useVolumeDucking()
      const [storedSettings] = usePreference(createDialogueVolumeDuckingPreferenceOptions())
      return {settings, storedSettings}
    },
    {wrapper: PreferenceProvider},
  )
  await vi.advanceTimersByTimeAsync(0)

  view.result.settings.changeVolume(10)

  expect(
    resolveDialoguePlayerGain(
      view.result.storedSettings() ?? DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
      true,
    ),
  ).toBe(0.1)
  expect(settingsMocks.write).not.toHaveBeenCalled()

  view.cleanup()
})

it('should restore player gain consumers when a debounced save fails', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.write.mockRejectedValueOnce(new Error('save failed'))
  const view = renderHook(
    () => {
      const settings = useVolumeDucking()
      const [storedSettings] = usePreference(createDialogueVolumeDuckingPreferenceOptions())
      return {settings, storedSettings}
    },
    {wrapper: PreferenceProvider},
  )
  await vi.advanceTimersByTimeAsync(0)

  view.result.settings.changeVolume(10)
  await vi.advanceTimersByTimeAsync(300)
  await vi.advanceTimersByTimeAsync(0)

  expect(view.result.settings.settings().playerVolumePercent).toBe(50)
  expect(
    resolveDialoguePlayerGain(
      view.result.storedSettings() ?? DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
      true,
    ),
  ).toBe(0.5)
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to save dialogue volume ducking settings.',
    expect.any(Error),
  )

  view.cleanup()
})
