/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT,
} from '../volume-ducking-settings'
import {resolveDialoguePlayerGain, usePlayerVolumeDucking} from '../use-player-volume-ducking'

const settingsMocks = vi.hoisted(() => ({
  read: vi.fn(),
}))

vi.mock('../volume-ducking-settings', async () => {
  const actual: typeof import('../volume-ducking-settings') = await vi.importActual(
    '../volume-ducking-settings',
  )

  return {...actual, readDialogueVolumeDuckingSettings: settingsMocks.read}
})

beforeEach(() => {
  settingsMocks.read.mockResolvedValue(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
})

afterEach(() => {
  localStorage.clear()
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
  let dispose: () => void = () => undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    const [isDialogueActive, setActive] = createSignal(false)
    setDialogueActive = setActive
    usePlayerVolumeDucking({isDialogueActive, onGainChange})
  })
  await Promise.resolve()

  expect(onGainChange).toHaveBeenLastCalledWith(1)

  setDialogueActive(true)
  expect(onGainChange).toHaveBeenLastCalledWith(0.5)

  window.dispatchEvent(
    new CustomEvent(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT, {
      detail: {enabled: true, playerVolumePercent: 35, version: 2},
    }),
  )
  expect(onGainChange).toHaveBeenLastCalledWith(0.35)

  window.dispatchEvent(
    new CustomEvent(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT, {
      detail: {enabled: false, playerVolumePercent: 35, version: 2},
    }),
  )
  expect(onGainChange).toHaveBeenLastCalledWith(1)
  dispose()
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
  let dispose: () => void = () => undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    usePlayerVolumeDucking({isDialogueActive: () => true, onGainChange})
  })
  await Promise.resolve()

  window.dispatchEvent(
    new CustomEvent(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT, {
      detail: {enabled: true, playerVolumePercent: 20, version: 2},
    }),
  )
  resolveRead(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
  await Promise.resolve()

  expect(onGainChange).toHaveBeenLastCalledWith(0.2)
  dispose()
})

it('should ignore unrelated events and report settings read failures', async () => {
  const failure = new Error('read failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.read.mockRejectedValueOnce(failure)
  const onGainChange = vi.fn()
  let dispose: () => void = () => undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    usePlayerVolumeDucking({isDialogueActive: () => true, onGainChange})
  })
  window.dispatchEvent(new Event(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT))
  window.dispatchEvent(
    new CustomEvent(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT, {detail: {version: 9}}),
  )
  await Promise.resolve()
  await Promise.resolve()

  expect(onGainChange).toHaveBeenLastCalledWith(0.5)
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to load dialogue volume ducking settings.',
    failure,
  )
  dispose()
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
  let dispose: () => void = () => undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    usePlayerVolumeDucking({isDialogueActive: () => true, onGainChange})
  })
  dispose()
  resolveRead(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
  await Promise.resolve()

  expect(onGainChange).toHaveBeenCalledOnce()
})
