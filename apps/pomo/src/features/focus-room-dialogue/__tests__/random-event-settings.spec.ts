/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createRandomEventSettingsRepository,
  DEFAULT_RANDOM_EVENT_SETTINGS,
  parseRandomEventSettings,
  type RandomEventSettings,
  type RandomEventSettingsStorage,
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
  Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
  vi.restoreAllMocks()
})

describe('parseRandomEventSettings', () => {
  it('should parse valid settings and reject invalid shapes', () => {
    const settings = {maximumMinutes: 8, minimumMinutes: 4, version: 1} as const

    expect(parseRandomEventSettings(settings)).toEqual(settings)
    expect(parseRandomEventSettings({...settings, minimumMinutes: 9})).toBeNull()
  })
})

describe('readRandomEventSettings', () => {
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
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(JSON.stringify({...settings, isEnabled: false}))

    expect(await readRandomEventSettings()).toEqual(settings)
    expect(JSON.parse(localStorage.getItem('pomo:random-event-settings:v1') ?? '')).toEqual(
      settings,
    )
  })

  it.each([null, JSON.stringify({maximumMinutes: 8, minimumMinutes: 4, version: 1})])(
    'should repair native settings from the browser copy before browser storage is cleared (%s)',
    async (initialNativeValue) => {
      const settings = {maximumMinutes: 30, minimumMinutes: 15, version: 1} as const
      let nativeValue = initialNativeValue
      Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
      localStorage.setItem('pomo:random-event-settings:v1', JSON.stringify(settings))
      storageMocks.getItem.mockImplementation(async () => nativeValue)
      storageMocks.setItem.mockImplementation(async (_key, value) => {
        nativeValue = value
      })

      await expect(readRandomEventSettings()).resolves.toEqual(settings)
      await vi.waitFor(() => expect(nativeValue).toBe(JSON.stringify(settings)))
      localStorage.clear()

      await expect(readRandomEventSettings()).resolves.toEqual(settings)
    },
  )

  it('should use defaults when native settings are empty or unreadable', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('unavailable'))

    await expect(readRandomEventSettings()).resolves.toEqual(DEFAULT_RANDOM_EVENT_SETTINGS)
    await expect(readRandomEventSettings()).resolves.toEqual(DEFAULT_RANDOM_EVENT_SETTINGS)
  })

  it('should recover the newest browser copy when a native read fails', async () => {
    const settings = {maximumMinutes: 8, minimumMinutes: 4, version: 1} as const
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
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
})

describe('writeRandomEventSettings', () => {
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
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Browser storage unavailable')
    })
    storageMocks.setItem.mockRejectedValue(new Error('Native storage unavailable'))

    await expect(
      writeRandomEventSettings({maximumMinutes: 30, minimumMinutes: 15, version: 1}),
    ).rejects.toThrow('Failed to persist random event settings.')
  })

  it('should use native storage when browser storage is unavailable', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Browser storage unavailable')
    })
    storageMocks.setItem.mockResolvedValue(undefined)

    await expect(
      writeRandomEventSettings({maximumMinutes: 30, minimumMinutes: 15, version: 1}),
    ).resolves.toBeUndefined()
  })

  it('should report native storage failure after browser storage succeeds', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    const nativeError = new Error('Native storage unavailable')
    const settings = {maximumMinutes: 30, minimumMinutes: 15, version: 1} as const
    storageMocks.setItem.mockRejectedValue(nativeError)

    await expect(writeRandomEventSettings(settings)).rejects.toMatchObject({
      cause: nativeError,
      message: 'Failed to persist random event settings.',
    })
    expect(JSON.parse(localStorage.getItem('pomo:random-event-settings:v1') ?? '')).toEqual(
      settings,
    )
  })

  it('should preserve native write order during rapid settings changes', async () => {
    const firstSettings = {maximumMinutes: 8, minimumMinutes: 4, version: 1} as const
    const secondSettings = {maximumMinutes: 30, minimumMinutes: 15, version: 1} as const
    const nativeWrites: string[] = []
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.setItem.mockImplementation(async (_key, value) => {
      nativeWrites.push(value)
    })

    await Promise.all([
      writeRandomEventSettings(firstSettings),
      writeRandomEventSettings(secondSettings),
    ])

    expect(nativeWrites).toEqual([JSON.stringify(firstSettings), JSON.stringify(secondSettings)])
  })
})

describe('createRandomEventSettingsRepository', () => {
  const createStorage = (): RandomEventSettingsStorage => ({
    isNative: () => true,
    readToss: async () => null,
    readWeb: () => null,
    writeToss: async () => undefined,
    writeWeb: () => null,
  })

  it('should retain browser settings after native repair fails and retry on the next read', async () => {
    const settings = {maximumMinutes: 30, minimumMinutes: 15, version: 1} as const
    const writeToss = vi
      .fn()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValue(undefined)
    const repository = createRandomEventSettingsRepository({
      ...createStorage(),
      readWeb: () => settings,
      writeToss,
    })

    await expect(repository.read()).resolves.toEqual(settings)
    await expect(repository.read()).resolves.toEqual(settings)

    expect(writeToss.mock.calls).toEqual([[settings], [settings]])
  })

  it('should retain the previous settings when both stores reject a new save', async () => {
    const initial = {maximumMinutes: 8, minimumMinutes: 4, version: 1} as const
    const repository = createRandomEventSettingsRepository({
      ...createStorage(),
      readWeb: () => initial,
      writeToss: async () => {
        throw new Error('Native storage unavailable')
      },
      writeWeb: () => new Error('Browser storage unavailable'),
    })

    await expect(
      repository.write({maximumMinutes: 30, minimumMinutes: 15, version: 1}),
    ).rejects.toThrow('Failed to persist random event settings.')
    await expect(repository.read()).resolves.toEqual(initial)
  })

  it('should resume browser repair after browser persistence recovers', async () => {
    const initial = {maximumMinutes: 8, minimumMinutes: 4, version: 1} as const
    const latest = {maximumMinutes: 30, minimumMinutes: 15, version: 1} as const
    let webSettings: RandomEventSettings = initial
    let nativeSettings: RandomEventSettings = initial
    const writeWeb = vi
      .fn<RandomEventSettingsStorage['writeWeb']>((settings) => {
        webSettings = settings
        return null
      })
      .mockReturnValueOnce(new Error('Browser storage unavailable'))
    const repository = createRandomEventSettingsRepository({
      ...createStorage(),
      readToss: async () => nativeSettings,
      readWeb: () => webSettings,
      writeToss: async (settings) => {
        nativeSettings = settings
      },
      writeWeb,
    })

    await repository.write(latest)
    await expect(repository.read()).resolves.toEqual(latest)
    expect(webSettings).toEqual(latest)
    nativeSettings = initial

    await expect(repository.read()).resolves.toEqual(latest)
    expect(nativeSettings).toEqual(latest)
  })

  it('should keep another repository write from restarting a pending read', async () => {
    const pending = Promise.withResolvers<typeof DEFAULT_RANDOM_EVENT_SETTINGS>()
    const readToss = vi.fn(() => pending.promise)
    const first = createRandomEventSettingsRepository({...createStorage(), readToss})
    const second = createRandomEventSettingsRepository(createStorage())
    const read = first.read()

    await second.write({maximumMinutes: 4, minimumMinutes: 2, version: 1})
    pending.resolve(DEFAULT_RANDOM_EVENT_SETTINGS)

    expect(await read).toEqual(DEFAULT_RANDOM_EVENT_SETTINGS)
    expect(readToss).toHaveBeenCalledTimes(1)
  })
})
