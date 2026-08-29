/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  parseDialogueVolumeDuckingSettings,
  readDialogueVolumeDuckingSettings,
  writeDialogueVolumeDuckingSettings,
} from '../volume-ducking-settings'

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

it('should default dialogue player output to fifty percent', async () => {
  expect(await readDialogueVolumeDuckingSettings()).toEqual(
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  )
})

it('should parse valid settings and reject invalid percentages', () => {
  const settings = {enabled: false, playerVolumePercent: 72, version: 2} as const

  expect(parseDialogueVolumeDuckingSettings(settings)).toEqual(settings)
  expect(parseDialogueVolumeDuckingSettings({...settings, playerVolumePercent: 101})).toBeNull()
})

it('should persist and restore browser settings', async () => {
  const settings = {enabled: true, playerVolumePercent: 35, version: 2} as const

  await writeDialogueVolumeDuckingSettings(settings)

  await expect(readDialogueVolumeDuckingSettings()).resolves.toEqual(settings)
  expect(storageMocks.setItem).not.toHaveBeenCalled()
})

it('should restore native settings when the browser copy is unavailable', async () => {
  const settings = {enabled: false, playerVolumePercent: 65, version: 2} as const
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue(JSON.stringify(settings))

  await expect(readDialogueVolumeDuckingSettings()).resolves.toEqual(settings)
  expect(
    JSON.parse(localStorage.getItem('pomo:dialogue-volume-ducking-settings:v2') ?? ''),
  ).toEqual(settings)
})

it('should reinterpret a legacy reduction percentage as the dialogue player volume', async () => {
  localStorage.setItem(
    'pomo:dialogue-volume-ducking-settings:v1',
    JSON.stringify({enabled: true, reductionPercent: 10, version: 1}),
  )

  await expect(readDialogueVolumeDuckingSettings()).resolves.toEqual({
    enabled: true,
    playerVolumePercent: 10,
    version: 2,
  })
  expect(
    JSON.parse(localStorage.getItem('pomo:dialogue-volume-ducking-settings:v2') ?? ''),
  ).toEqual({enabled: true, playerVolumePercent: 10, version: 2})
})

it('should reinterpret legacy native settings when browser settings are unavailable', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockImplementation(async (key) =>
    key.endsWith(':v1') ? JSON.stringify({enabled: false, reductionPercent: 25, version: 1}) : null,
  )

  await expect(readDialogueVolumeDuckingSettings()).resolves.toEqual({
    enabled: false,
    playerVolumePercent: 25,
    version: 2,
  })
})

it('should reject when browser storage cannot persist settings', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Browser storage unavailable')
  })

  await expect(
    writeDialogueVolumeDuckingSettings({enabled: true, playerVolumePercent: 35, version: 2}),
  ).rejects.toThrow('Failed to persist dialogue volume ducking settings.')
})

it('should default when native settings are missing or unreadable', async () => {
  localStorage.setItem(
    'pomo:dialogue-volume-ducking-settings:v1',
    JSON.stringify({enabled: true, reductionPercent: 101, version: 1}),
  )
  await expect(readDialogueVolumeDuckingSettings()).resolves.toEqual(
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  )
  localStorage.clear()

  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce(null)

  await expect(readDialogueVolumeDuckingSettings()).resolves.toEqual(
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  )

  storageMocks.getItem.mockRejectedValueOnce(new Error('native unavailable'))
  await expect(readDialogueVolumeDuckingSettings()).resolves.toEqual(
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  )
})

it('should not let a native read overwrite a newer browser setting', async () => {
  const nativeSettings = {enabled: false, playerVolumePercent: 70, version: 2} as const
  const latestSettings = {enabled: true, playerVolumePercent: 20, version: 2} as const
  let resolveNativeRead: (value: string) => void = () => undefined
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveNativeRead = resolve
    }),
  )
  storageMocks.setItem.mockResolvedValue(undefined)

  const readRequest = readDialogueVolumeDuckingSettings()
  await writeDialogueVolumeDuckingSettings(latestSettings)
  resolveNativeRead(JSON.stringify(nativeSettings))

  await expect(readRequest).resolves.toEqual(nativeSettings)
  expect(
    JSON.parse(localStorage.getItem('pomo:dialogue-volume-ducking-settings:v2') ?? ''),
  ).toEqual(latestSettings)
})

it('should persist through either available native runtime storage', async () => {
  const settings = {enabled: true, playerVolumePercent: 30, version: 2} as const
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})

  storageMocks.setItem.mockResolvedValueOnce(undefined)
  await expect(writeDialogueVolumeDuckingSettings(settings)).resolves.toBeUndefined()

  storageMocks.setItem.mockRejectedValueOnce(new Error('native unavailable'))
  await expect(writeDialogueVolumeDuckingSettings(settings)).resolves.toBeUndefined()

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('browser unavailable')
  })
  storageMocks.setItem.mockResolvedValueOnce(undefined)
  await expect(writeDialogueVolumeDuckingSettings(settings)).resolves.toBeUndefined()

  storageMocks.setItem.mockRejectedValueOnce(new Error('native unavailable'))
  await expect(writeDialogueVolumeDuckingSettings(settings)).rejects.toThrow(
    'Failed to persist dialogue volume ducking settings.',
  )
})
