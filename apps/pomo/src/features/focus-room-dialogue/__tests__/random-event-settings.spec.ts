/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  readRandomEventSettings,
  writeRandomEventSettings,
} from '../random-event-settings'

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

it('should use ten-to-twenty minute defaults', async () => {
  expect(await readRandomEventSettings()).toEqual(DEFAULT_RANDOM_EVENT_SETTINGS)
})

it('should persist and restore browser settings', async () => {
  const settings = {maximumMinutes: 30, minimumMinutes: 15, version: 1} as const

  await writeRandomEventSettings(settings)

  expect(await readRandomEventSettings()).toEqual(settings)
  expect(storageMocks.setItem).not.toHaveBeenCalled()
})

it('should restore native settings when the browser copy is unavailable', async () => {
  const settings = {maximumMinutes: 8, minimumMinutes: 4, version: 1} as const
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue(JSON.stringify({...settings, isEnabled: false}))

  expect(await readRandomEventSettings()).toEqual(settings)
  expect(JSON.parse(localStorage.getItem('pomo:random-event-settings:v1') ?? '')).toEqual(settings)
})

it('should reject an invalid interval before saving', async () => {
  await expect(
    writeRandomEventSettings({
      maximumMinutes: 5,
      minimumMinutes: 10,
      version: 1,
    }),
  ).rejects.toThrow()
})

it('should reject when browser storage cannot persist the settings', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Browser storage unavailable')
  })

  await expect(
    writeRandomEventSettings({maximumMinutes: 30, minimumMinutes: 15, version: 1}),
  ).rejects.toThrow('Failed to persist random event settings.')
})

it('should reject when neither browser nor native storage can persist the settings', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Browser storage unavailable')
  })
  storageMocks.setItem.mockRejectedValue(new Error('Native storage unavailable'))

  await expect(
    writeRandomEventSettings({maximumMinutes: 30, minimumMinutes: 15, version: 1}),
  ).rejects.toThrow('Failed to persist random event settings.')
})

it('should use native storage when browser storage is unavailable', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Browser storage unavailable')
  })
  storageMocks.setItem.mockResolvedValue(undefined)

  await expect(
    writeRandomEventSettings({maximumMinutes: 30, minimumMinutes: 15, version: 1}),
  ).resolves.toBeUndefined()
})

it('should retain a successful browser save when native storage is unavailable', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.setItem.mockRejectedValue(new Error('Native storage unavailable'))

  await expect(
    writeRandomEventSettings({maximumMinutes: 30, minimumMinutes: 15, version: 1}),
  ).resolves.toBeUndefined()
})
