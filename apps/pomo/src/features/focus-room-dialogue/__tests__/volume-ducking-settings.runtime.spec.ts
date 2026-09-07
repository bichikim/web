/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  readDialogueVolumeDuckingSettings,
  writeDialogueVolumeDuckingSettings,
} from '../volume-ducking-settings'

const STORAGE_KEY = 'pomo:dialogue-volume-ducking-settings:v2'
const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

beforeEach(() => {
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})

it('should connect the browser repository to local storage', async () => {
  const settings = {enabled: true, playerVolumePercent: 35, version: 2} as const

  await writeDialogueVolumeDuckingSettings(settings)

  await expect(readDialogueVolumeDuckingSettings()).resolves.toEqual(settings)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toEqual(settings)
})

it('should connect the native repository to Apps in Toss storage', async () => {
  const settings = {enabled: false, playerVolumePercent: 20, version: 2} as const
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue(JSON.stringify(settings))
  storageMocks.setItem.mockResolvedValue(undefined)

  await expect(readDialogueVolumeDuckingSettings()).resolves.toEqual(settings)
  await expect(writeDialogueVolumeDuckingSettings(settings)).resolves.toBeUndefined()
  expect(storageMocks.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(settings))
})

it('should translate browser and native adapter write failures', async () => {
  const settings = {enabled: true, playerVolumePercent: 30, version: 2} as const
  const browserWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('browser unavailable')
  })

  await expect(writeDialogueVolumeDuckingSettings(settings)).rejects.toThrow(
    'Failed to persist dialogue volume ducking settings.',
  )

  browserWrite.mockRestore()
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.setItem.mockRejectedValue(new Error('native unavailable'))

  await expect(writeDialogueVolumeDuckingSettings(settings)).rejects.toThrow(
    'Failed to persist dialogue volume ducking settings.',
  )
})
