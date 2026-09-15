/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
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
  render(() => <DialogueVolumeDuckingSettings />)
  await vi.advanceTimersByTimeAsync(0)

  expect(screen.getByRole('heading', {name: '대화 옵션'})).toBeDefined()
  expect(screen.getByRole('switch', {name: '대화 중 플레이어 음량 낮춤'})).toBeChecked()
  expect(screen.getByRole('slider', {name: '대화 중 플레이어 음량 비율'})).toHaveValue('50')
  expect(screen.getByRole('slider').closest('div')).toHaveClass(
    'border-content-border',
    'bg-content-surface',
  )

  fireEvent.input(screen.getByRole('slider'), {target: {value: '37'}})
  expect(screen.getByText('37%')).toBeDefined()

  await vi.advanceTimersByTimeAsync(300)
  expect(settingsMocks.write).toHaveBeenCalledWith({
    enabled: true,
    playerVolumePercent: 37,
    version: 2,
  })
  await vi.advanceTimersByTimeAsync(0)
  expect(screen.queryByText('플레이어 음량 설정을 저장했어요.')).toBeNull()
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
