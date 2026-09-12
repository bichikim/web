/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  parseRandomEventSettings,
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

it('should parse valid settings and reject invalid shapes', () => {
  const settings = {maximumMinutes: 8, minimumMinutes: 4, version: 1} as const

  expect(parseRandomEventSettings(settings)).toEqual(settings)
  expect(parseRandomEventSettings({...settings, minimumMinutes: 9})).toBeNull()
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

it('should use defaults when native settings are empty or unreadable', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('unavailable'))

  await expect(readRandomEventSettings()).resolves.toEqual(DEFAULT_RANDOM_EVENT_SETTINGS)
  await expect(readRandomEventSettings()).resolves.toEqual(DEFAULT_RANDOM_EVENT_SETTINGS)
})

it('should recover the newest browser copy when a native read fails', async () => {
  const settings = {maximumMinutes: 8, minimumMinutes: 4, version: 1} as const
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let rejectRead: (error: Error) => void = () => undefined
  storageMocks.getItem.mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectRead = reject
    }),
  )

  const pendingRead = readRandomEventSettings()
  localStorage.setItem('pomo:random-event-settings:v1', JSON.stringify(settings))
  rejectRead(new Error('native read unavailable'))

  await expect(pendingRead).resolves.toEqual(settings)
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

it.each([
  ['stale', JSON.stringify({maximumMinutes: 8, minimumMinutes: 4, version: 1})],
  ['empty', null],
  ['invalid', JSON.stringify({maximumMinutes: 2, minimumMinutes: 4, version: 1})],
])(
  'should return the newer browser copy when a pending native read is %s',
  async (_label, nativeValue) => {
    const nextSettings = {maximumMinutes: 30, minimumMinutes: 15, version: 1} as const
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    const nativeRead = Promise.withResolvers<string | null>()
    storageMocks.getItem.mockReturnValue(nativeRead.promise)
    storageMocks.setItem.mockResolvedValue()

    const pendingRead = readRandomEventSettings()
    await writeRandomEventSettings(nextSettings)
    nativeRead.resolve(nativeValue)

    await expect(pendingRead).resolves.toEqual(nextSettings)
    expect(JSON.parse(localStorage.getItem('pomo:random-event-settings:v1') ?? '')).toEqual(
      nextSettings,
    )
  },
)

it('should preserve native write order during rapid settings changes', async () => {
  const firstSettings = {maximumMinutes: 8, minimumMinutes: 4, version: 1} as const
  const secondSettings = {maximumMinutes: 30, minimumMinutes: 15, version: 1} as const
  const nativeWrites: string[] = []
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.setItem.mockImplementation(async (_key, value) => {
    nativeWrites.push(value)
  })

  await Promise.all([
    writeRandomEventSettings(firstSettings),
    writeRandomEventSettings(secondSettings),
  ])

  expect(nativeWrites).toEqual([JSON.stringify(firstSettings), JSON.stringify(secondSettings)])
})

it.each(['resolved', 'rejected'])(
  'should reload the newest native settings when browser persistence fails and the pending read is %s',
  async (result) => {
    const nextSettings = {maximumMinutes: 30, minimumMinutes: 15, version: 1} as const
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Browser storage unavailable')
    })
    const nativeRead = Promise.withResolvers<string | null>()
    storageMocks.getItem
      .mockReturnValueOnce(nativeRead.promise)
      .mockResolvedValue(JSON.stringify(nextSettings))
    storageMocks.setItem.mockResolvedValue()

    const pendingRead = readRandomEventSettings()
    await vi.waitFor(() => expect(storageMocks.getItem).toHaveBeenCalledTimes(1))
    await writeRandomEventSettings(nextSettings)

    if (result === 'resolved') {
      nativeRead.resolve(JSON.stringify({maximumMinutes: 8, minimumMinutes: 4, version: 1}))
    } else {
      nativeRead.reject(new Error('Native read unavailable'))
    }

    await expect(pendingRead).resolves.toEqual(nextSettings)
    expect(storageMocks.getItem).toHaveBeenCalledTimes(2)
  },
)
