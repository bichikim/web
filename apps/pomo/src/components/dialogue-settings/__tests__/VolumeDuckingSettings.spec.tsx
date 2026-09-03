/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT,
  type DialogueVolumeDuckingSettings as DialogueVolumeDuckingSettingsValue,
} from 'src/features/focus-room-dialogue'
import {DialogueVolumeDuckingSettings} from '../VolumeDuckingSettings'

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
    readDialogueVolumeDuckingSettings: settingsMocks.read,
    writeDialogueVolumeDuckingSettings: settingsMocks.write,
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

it('should show the dialogue option and save the selected player volume percentage', async () => {
  const settingsEvents: DialogueVolumeDuckingSettingsValue[] = []
  const handleSettings = (event: Event) => {
    if (event instanceof CustomEvent) {
      settingsEvents.push(event.detail as DialogueVolumeDuckingSettingsValue)
    }
  }
  window.addEventListener(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT, handleSettings)
  render(() => <DialogueVolumeDuckingSettings />)
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByRole('heading', {name: '대화 옵션'})).toBeDefined()
  expect(screen.getByRole('switch', {name: '대화 중 플레이어 음량 낮춤'})).toBeChecked()
  expect(screen.getByRole('slider', {name: '대화 중 플레이어 음량 비율'})).toHaveValue('50')
  expect(screen.getByRole('slider').closest('.pomo-dialogue-settings__volume-ducking')).toHaveClass(
    'border-content-border',
    'bg-content-surface',
  )

  fireEvent.input(screen.getByRole('slider'), {target: {value: '37'}})
  expect(screen.getByText('37%')).toBeDefined()
  expect(settingsEvents.at(-1)).toEqual({enabled: true, playerVolumePercent: 37, version: 2})

  await vi.advanceTimersByTimeAsync(299)
  expect(settingsMocks.write).not.toHaveBeenCalled()
  fireEvent.input(screen.getByRole('slider'), {target: {value: '38'}})
  await vi.advanceTimersByTimeAsync(299)
  expect(settingsMocks.write).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(settingsMocks.write).toHaveBeenCalledWith({
    enabled: true,
    playerVolumePercent: 38,
    version: 2,
  })
  await vi.advanceTimersByTimeAsync(0)
  expect(screen.getByText('플레이어 음량 설정을 저장했어요.')).toBeDefined()
  window.removeEventListener(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT, handleSettings)
})

it('should disable percentage changes when volume lowering is turned off', async () => {
  render(() => <DialogueVolumeDuckingSettings />)
  await vi.advanceTimersByTimeAsync(0)

  fireEvent.click(screen.getByRole('switch', {name: '대화 중 플레이어 음량 낮춤'}))

  expect(screen.getByRole('switch')).not.toBeChecked()
  expect(screen.getByRole('slider')).toBeDisabled()
  await vi.advanceTimersByTimeAsync(300)
  expect(settingsMocks.write).toHaveBeenCalledWith({
    ...DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
    enabled: false,
  })
})

it('should flush a pending change when the settings unmount', async () => {
  const result = render(() => <DialogueVolumeDuckingSettings />)
  await vi.advanceTimersByTimeAsync(0)

  fireEvent.input(screen.getByRole('slider'), {target: {value: '72'}})
  result.unmount()
  await vi.advanceTimersByTimeAsync(0)

  expect(settingsMocks.write).toHaveBeenCalledWith({
    enabled: true,
    playerVolumePercent: 72,
    version: 2,
  })
})

it('should report loading and saving failures', async () => {
  const loadFailure = new Error('load failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.read.mockRejectedValueOnce(loadFailure)
  render(() => <DialogueVolumeDuckingSettings />)
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByText('플레이어 음량 설정을 불러오지 못했어요.')).toBeDefined()
  expect(screen.getByRole('switch')).not.toBeDisabled()
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to load dialogue volume ducking settings.',
    loadFailure,
  )

  settingsMocks.write.mockRejectedValueOnce(new Error('save failed'))
  fireEvent.click(screen.getByRole('switch'))
  await vi.advanceTimersByTimeAsync(300)
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByText('플레이어 음량 설정을 저장하지 못했어요.')).toBeDefined()
})

it('should ignore settings work completed after unmount', async () => {
  let resolveRead: (settings: DialogueVolumeDuckingSettingsValue) => void = () => undefined
  settingsMocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveRead = resolve
    }),
  )
  const first = render(() => <DialogueVolumeDuckingSettings />)
  first.unmount()
  resolveRead({...DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS, playerVolumePercent: 15})
  await vi.advanceTimersByTimeAsync(0)

  let resolveWrite: () => void = () => undefined
  settingsMocks.write.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveWrite = resolve
    }),
  )
  const second = render(() => <DialogueVolumeDuckingSettings />)
  await vi.advanceTimersByTimeAsync(0)
  fireEvent.input(screen.getByRole('slider'), {target: {value: '61'}})
  await vi.advanceTimersByTimeAsync(300)
  second.unmount()
  resolveWrite()
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.queryByRole('status')).toBeNull()
})

it('should ignore settings failures completed after unmount', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  let rejectRead: (error: Error) => void = () => undefined
  settingsMocks.read.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectRead = reject
    }),
  )
  const first = render(() => <DialogueVolumeDuckingSettings />)
  first.unmount()
  rejectRead(new Error('late load failure'))
  await vi.advanceTimersByTimeAsync(0)

  let rejectWrite: (error: Error) => void = () => undefined
  settingsMocks.write.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectWrite = reject
    }),
  )
  const second = render(() => <DialogueVolumeDuckingSettings />)
  await vi.advanceTimersByTimeAsync(0)
  fireEvent.input(screen.getByRole('slider'), {target: {value: '62'}})
  await vi.advanceTimersByTimeAsync(300)
  second.unmount()
  rejectWrite(new Error('late save failure'))
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.queryByText(/설정을 .* 못했어요/)).toBeNull()
  expect(consoleError).toHaveBeenCalledTimes(2)
})

it('should log a pending save failure after unmount', async () => {
  const failure = new Error('flush failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  settingsMocks.write.mockRejectedValueOnce(failure)
  const result = render(() => <DialogueVolumeDuckingSettings />)
  await vi.advanceTimersByTimeAsync(0)
  fireEvent.input(screen.getByRole('slider'), {target: {value: '63'}})

  result.unmount()
  await vi.advanceTimersByTimeAsync(0)

  expect(consoleError).toHaveBeenCalledWith(
    'Failed to save dialogue volume ducking settings.',
    failure,
  )
})
