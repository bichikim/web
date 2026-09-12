/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type AutoStartStorage,
  createAutoStartStorage,
  readAutoStartPreference as readRuntimePreference,
  writeAutoStartPreference as writeRuntimePreference,
} from '../auto-start-storage'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

let repository: AutoStartStorage
const now = vi.fn<() => number>()
const readAutoStartPreference = () => repository.read()
const writeAutoStartPreference = (isEnabled: boolean) => repository.write(isEnabled)

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: storageMocks,
}))

describe('auto-start-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.setItem.mockReset()
    now.mockReturnValue(20)
    repository = createAutoStartStorage({
      now,
      storage: {
        readToss: readTossStorageJson,
        readWeb: readWebStorageJson,
        usesTossStorage: hasNativeStorageBridge,
        writeToss: writeTossStorageJson,
        writeWeb: writeWebStorageJson,
      },
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'ReactNativeWebView')
    vi.restoreAllMocks()
  })

  it('should expose browser persistence through the default runtime instance', async () => {
    await writeRuntimePreference(true)
    expect(await readRuntimePreference()).toBe(true)
    expect(JSON.parse(localStorage.getItem('pomo:timer-auto-start:v2') ?? '')).toEqual({
      isEnabled: true,
      savedAt: expect.any(Number),
    })
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should use browser storage outside the host app', async () => {
    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
    expect(JSON.parse(localStorage.getItem('pomo:timer-auto-start:v2') ?? '')).toEqual({
      isEnabled: true,
      savedAt: 20,
    })
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should read the legacy browser preference', async () => {
    localStorage.setItem('pomo:timer-auto-start:v1', 'true')

    expect(await readAutoStartPreference()).toBe(true)
  })

  it('should read the legacy native preference', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockImplementation(async (key) =>
      key === 'pomo:timer-auto-start:v1' ? 'true' : null,
    )

    expect(await readAutoStartPreference()).toBe(true)
    expect(storageMocks.getItem).toHaveBeenNthCalledWith(1, 'pomo:timer-auto-start:v2')
    expect(storageMocks.getItem).toHaveBeenNthCalledWith(2, 'pomo:timer-auto-start:v1')
  })

  it('should ignore malformed browser preferences', async () => {
    localStorage.setItem('pomo:timer-auto-start:v2', '{invalid')

    expect(await readAutoStartPreference()).toBe(false)
  })

  it('should ignore browser values that do not match current or legacy schemas', async () => {
    localStorage.setItem('pomo:timer-auto-start:v2', JSON.stringify({isEnabled: 'yes', savedAt: 1}))
    localStorage.setItem('pomo:timer-auto-start:v1', JSON.stringify('yes'))

    expect(await readAutoStartPreference()).toBe(false)
  })

  it('should mirror the latest preference to native storage', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(JSON.stringify({isEnabled: true, savedAt: 20}))
    storageMocks.setItem.mockResolvedValue()

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
    const [storageKey, storedValue] = storageMocks.setItem.mock.calls[0] ?? []
    expect(storageKey).toBe('pomo:timer-auto-start:v2')
    expect(JSON.parse(storedValue ?? '')).toEqual({isEnabled: true, savedAt: 20})
  })

  it('should fall back to browser storage when native storage is empty', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(null)
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
  })

  it('should fall back to browser storage when native storage fails', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockRejectedValue(new Error('native storage unavailable'))
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
  })

  it('should use the disabled default when native storage is empty or fails', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(null)
    expect(await readAutoStartPreference()).toBe(false)

    storageMocks.getItem.mockRejectedValue(new Error('native storage unavailable'))
    expect(await readAutoStartPreference()).toBe(false)
  })

  it('should select a newer browser value when the native copy is stale', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockImplementation(async (key) =>
      key === 'pomo:timer-auto-start:v1' ? 'false' : null,
    )
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
  })

  it('should select a newer native value', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:timer-auto-start:v2',
      JSON.stringify({isEnabled: false, savedAt: 10}),
    )
    storageMocks.getItem.mockResolvedValue(JSON.stringify({isEnabled: true, savedAt: 15}))

    expect(await readAutoStartPreference()).toBe(true)
  })

  it.each([
    {initialValue: null, isEnabled: true, legacy: false, rejects: false},
    {initialValue: true, isEnabled: false, legacy: false, rejects: false},
    {initialValue: false, isEnabled: true, legacy: true, rejects: false},
    {initialValue: null, isEnabled: true, legacy: false, rejects: true},
    {initialValue: true, isEnabled: false, legacy: true, rejects: true},
  ])(
    'should return the latest write during a native read: $initialValue → $isEnabled, legacy=$legacy, rejects=$rejects',
    async ({initialValue, isEnabled, legacy, rejects}) => {
      Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
      if (initialValue !== null) {
        localStorage.setItem(
          'pomo:timer-auto-start:v2',
          JSON.stringify({isEnabled: initialValue, savedAt: 10}),
        )
      }
      const pendingRead = Promise.withResolvers<string | null>()
      const pendingKey = legacy ? 'pomo:timer-auto-start:v1' : 'pomo:timer-auto-start:v2'
      storageMocks.getItem.mockImplementation((key) =>
        key === pendingKey ? pendingRead.promise : Promise.resolve(null),
      )
      storageMocks.setItem.mockResolvedValue()

      const reading = readAutoStartPreference()
      await vi.waitFor(() => expect(storageMocks.getItem).toHaveBeenCalledWith(pendingKey))
      await writeAutoStartPreference(!isEnabled)
      await writeAutoStartPreference(isEnabled)
      if (rejects) {
        pendingRead.reject(new Error('native storage unavailable'))
      } else {
        pendingRead.resolve(
          JSON.stringify(legacy ? !isEnabled : {isEnabled: !isEnabled, savedAt: 30}),
        )
      }

      expect(await reading).toBe(isEnabled)
      expect(JSON.parse(localStorage.getItem('pomo:timer-auto-start:v2') ?? '')).toEqual({
        isEnabled,
        savedAt: 20,
      })
    },
  )

  it.each([false, true])(
    'should retain a newer native result when a concurrent browser write fails after a successful write: %s',
    async (writeFirst) => {
      Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
      localStorage.setItem(
        'pomo:timer-auto-start:v2',
        JSON.stringify({isEnabled: false, savedAt: 10}),
      )
      const pendingRead = Promise.withResolvers<string | null>()
      storageMocks.getItem.mockReturnValue(pendingRead.promise)
      storageMocks.setItem.mockResolvedValue()
      const reading = readAutoStartPreference()
      await vi.waitFor(() => expect(storageMocks.getItem).toHaveBeenCalled())
      if (writeFirst) {
        await writeAutoStartPreference(false)
      }
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('browser storage unavailable')
      })
      now.mockReturnValue(21)
      await writeAutoStartPreference(true)
      pendingRead.resolve(JSON.stringify({isEnabled: true, savedAt: 21}))

      expect(await reading).toBe(true)
      expect(storageMocks.setItem).toHaveBeenCalledWith(
        'pomo:timer-auto-start:v2',
        JSON.stringify({isEnabled: true, savedAt: 21}),
      )
    },
  )

  it('should compare the current browser value after a later write fails', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:timer-auto-start:v2',
      JSON.stringify({isEnabled: false, savedAt: 10}),
    )
    const pendingRead = Promise.withResolvers<string | null>()
    storageMocks.getItem.mockReturnValue(pendingRead.promise)
    storageMocks.setItem.mockResolvedValue()

    const reading = readAutoStartPreference()
    await vi.waitFor(() => expect(storageMocks.getItem).toHaveBeenCalled())
    await writeAutoStartPreference(true)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('browser storage unavailable')
    })
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))
    await writeAutoStartPreference(false)
    pendingRead.resolve(JSON.stringify({isEnabled: false, savedAt: 10}))

    expect(await reading).toBe(true)
  })

  it('should serialize native writes and finish with the latest value', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    const completions: Array<() => void> = []
    storageMocks.setItem.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completions.push(resolve)
        }),
    )

    const firstWrite = writeAutoStartPreference(true)
    const secondWrite = writeAutoStartPreference(false)
    await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledTimes(1))
    completions[0]?.()
    await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledTimes(2))
    const repairedValue = storageMocks.setItem.mock.calls[1]?.[1]
    expect(JSON.parse(repairedValue ?? '')).toMatchObject({isEnabled: false})
    completions[1]?.()
    await Promise.all([firstWrite, secondWrite])
  })
  it('should isolate native convergence and clocks between instances', async () => {
    const pending = Promise.withResolvers<void>()
    const firstToss = vi
      .fn<(key: string, value: unknown) => Promise<void>>()
      .mockResolvedValue()
      .mockImplementationOnce(() => pending.promise)
    const secondToss = vi.fn<(key: string, value: unknown) => Promise<void>>().mockResolvedValue()
    const firstWeb = vi.fn().mockReturnValue(null)
    const secondWeb = vi.fn().mockReturnValue(null)
    const first = createAutoStartStorage({
      now: () => 10,
      storage: {
        readToss: async () => null,
        readWeb: () => null,
        usesTossStorage: () => true,
        writeToss: firstToss,
        writeWeb: firstWeb,
      },
    })
    const second = createAutoStartStorage({
      now: () => 30,
      storage: {
        readToss: async () => null,
        readWeb: () => null,
        usesTossStorage: () => true,
        writeToss: secondToss,
        writeWeb: secondWeb,
      },
    })
    const saving = first.write(true)
    const latest = first.write(false)
    await second.write(true)
    pending.resolve()
    await Promise.all([saving, latest])
    expect(firstToss).toHaveBeenCalledTimes(2)
    expect(firstToss).toHaveBeenLastCalledWith('pomo:timer-auto-start:v2', {
      isEnabled: false,
      savedAt: 10,
    })
    expect(secondToss).toHaveBeenCalledExactlyOnceWith('pomo:timer-auto-start:v2', {
      isEnabled: true,
      savedAt: 30,
    })
    expect(firstWeb).toHaveBeenLastCalledWith('pomo:timer-auto-start:v2', {
      isEnabled: false,
      savedAt: 10,
    })
    expect(secondWeb).toHaveBeenCalledExactlyOnceWith('pomo:timer-auto-start:v2', {
      isEnabled: true,
      savedAt: 30,
    })
  })
  it('should retain native read selection when another instance writes', async () => {
    const pending = Promise.withResolvers<void>()
    const first = createAutoStartStorage({
      now: () => 10,
      storage: {
        readToss: async (_key, parse) => {
          await pending.promise
          return parse({isEnabled: true, savedAt: 20})
        },
        readWeb: (_key, parse) => parse({isEnabled: false, savedAt: 1}),
        usesTossStorage: () => true,
        writeToss: async () => {},
        writeWeb: () => null,
      },
    })
    const second = createAutoStartStorage({
      now: () => 30,
      storage: {
        readToss: async () => null,
        readWeb: () => null,
        usesTossStorage: () => false,
        writeToss: async () => {},
        writeWeb: () => null,
      },
    })
    const reading = first.read()
    await second.write(false)
    pending.resolve()
    expect(await reading).toBe(true)
  })
})
