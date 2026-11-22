/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider, usePreference} from 'src/hooks/use-preference'
import {createDialogueVolumeDuckingPreferenceOptions} from 'src/features/focus-room-dialogue'
import {useVolumeDucking} from '../use-volume-ducking'

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), setItem: vi.fn()},
}))

import {Storage} from '@apps-in-toss/web-framework'

const STORAGE_KEY = 'pomo:dialogue-volume-ducking-settings:v2'
const savedSettings = {enabled: true, playerVolumePercent: 50, version: 2} as const
const mount = () =>
  renderHook(
    () => {
      const volume = useVolumeDucking()
      const [shared] = usePreference(createDialogueVolumeDuckingPreferenceOptions())
      return {shared, volume}
    },
    {wrapper: PreferenceProvider},
  )

beforeEach(() => {
  localStorage.clear()
  vi.mocked(Storage.getItem).mockReset().mockResolvedValue(JSON.stringify(savedSettings))
  vi.mocked(Storage.setItem).mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('ReactNativeWebView', {})
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it.each(['success', 'failure'] as const)(
  'should preserve a debouncing draft and shared preference after the previous native save %s',
  async (outcome) => {
    const first = Promise.withResolvers<void>()
    vi.mocked(Storage.setItem).mockReturnValueOnce(first.promise)
    const view = mount()
    await vi.advanceTimersByTimeAsync(0)

    view.result.volume.changeVolume(35)
    await vi.advanceTimersByTimeAsync(300)
    view.result.volume.changeVolume(40)
    await vi.advanceTimersByTimeAsync(100)
    expect(Storage.setItem).toHaveBeenCalledExactlyOnceWith(
      STORAGE_KEY,
      JSON.stringify({...savedSettings, playerVolumePercent: 35}),
    )

    if (outcome === 'success') {
      first.resolve()
    } else {
      first.reject(new Error('native write failed'))
    }
    await vi.advanceTimersByTimeAsync(0)

    expect(view.result.volume.settings().playerVolumePercent).toBe(40)
    expect(view.result.shared()?.playerVolumePercent).toBe(40)
    expect(Storage.setItem).toHaveBeenCalledOnce()

    view.result.volume.changeEnabled(false)
    await vi.advanceTimersByTimeAsync(300)

    const latest = {...savedSettings, enabled: false, playerVolumePercent: 40}
    expect(Storage.setItem).toHaveBeenCalledTimes(2)
    expect(Storage.setItem).toHaveBeenLastCalledWith(STORAGE_KEY, JSON.stringify(latest))
    expect(view.result.volume.settings()).toEqual(latest)
    expect(view.result.shared()).toEqual(latest)
    expect(view.result.volume.message()).toBeNull()
    view.cleanup()
    await vi.advanceTimersByTimeAsync(300)
    expect(Storage.setItem).toHaveBeenCalledTimes(2)
  },
)

it('should roll back the latest failed draft to the last successful native save', async () => {
  const first = Promise.withResolvers<void>()
  const second = Promise.withResolvers<void>()
  vi.mocked(Storage.setItem).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const view = mount()
  await vi.advanceTimersByTimeAsync(0)

  view.result.volume.changeVolume(35)
  await vi.advanceTimersByTimeAsync(300)
  view.result.volume.changeVolume(40)
  first.resolve()
  await vi.advanceTimersByTimeAsync(0)
  expect(view.result.volume.settings().playerVolumePercent).toBe(40)

  await vi.advanceTimersByTimeAsync(300)
  second.reject(new Error('latest native save failed'))
  await vi.advanceTimersByTimeAsync(0)

  expect(view.result.volume.settings()).toEqual({...savedSettings, playerVolumePercent: 35})
  expect(view.result.shared()).toEqual({...savedSettings, playerVolumePercent: 35})
  expect(view.result.volume.message()).toBe('플레이어 음량 설정을 저장하지 못했어요.')
  expect(Storage.setItem).toHaveBeenCalledTimes(2)
  view.cleanup()
})

it('should flush the latest draft once behind an in-flight native save on unmount', async () => {
  const first = Promise.withResolvers<void>()
  vi.mocked(Storage.setItem).mockReturnValueOnce(first.promise)
  const view = mount()
  await vi.advanceTimersByTimeAsync(0)

  view.result.volume.changeVolume(35)
  await vi.advanceTimersByTimeAsync(300)
  view.result.volume.changeVolume(40)
  view.result.volume.changeEnabled(false)
  view.cleanup()
  expect(Storage.setItem).toHaveBeenCalledOnce()

  first.resolve()
  await vi.advanceTimersByTimeAsync(300)

  expect(Storage.setItem).toHaveBeenCalledTimes(2)
  expect(Storage.setItem).toHaveBeenLastCalledWith(
    STORAGE_KEY,
    JSON.stringify({...savedSettings, enabled: false, playerVolumePercent: 40}),
  )
})

it('should retain an initial draft while the native read settles and save it only once', async () => {
  const initial = Promise.withResolvers<string | null>()
  vi.mocked(Storage.getItem).mockReturnValueOnce(initial.promise)
  const view = mount()
  expect(view.result.volume.isLoading()).toBe(true)
  view.result.volume.changeVolume(40)

  initial.resolve(JSON.stringify({...savedSettings, playerVolumePercent: 20}))
  await vi.advanceTimersByTimeAsync(0)
  expect(view.result.volume.isLoading()).toBe(false)
  expect(view.result.volume.settings().playerVolumePercent).toBe(40)
  expect(Storage.setItem).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(300)
  expect(Storage.setItem).toHaveBeenCalledExactlyOnceWith(
    STORAGE_KEY,
    JSON.stringify({...savedSettings, playerVolumePercent: 40}),
  )
  view.cleanup()
  await vi.advanceTimersByTimeAsync(300)
  expect(Storage.setItem).toHaveBeenCalledOnce()
})
