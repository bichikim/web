/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createViewedReleaseRepository,
  readViewedRelease,
  type VersionNoticeStorage,
  type ViewedRelease,
  writeViewedRelease,
} from '../viewed-release-storage'

const STORAGE_KEY = 'pomo:viewed-version-release:v1'
const viewedRelease = {
  formatVersion: 1,
  releasedAt: '2026-09-03T00:57:00+09:00',
  version: '2026. 09. 03 00:57',
} as const satisfies ViewedRelease
const nativeStorageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: nativeStorageMocks}))

const createStorage = (): VersionNoticeStorage =>
  ({
    readToss: vi.fn(),
    readWeb: vi.fn(() => null),
    usesTossStorage: vi.fn(() => false),
    writeToss: vi.fn(),
    writeWeb: vi.fn(),
  }) satisfies VersionNoticeStorage

beforeEach(() => {
  localStorage.clear()
  nativeStorageMocks.getItem.mockReset()
  nativeStorageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})

it('should read and write the browser storage for web and desktop runtimes', async () => {
  await writeViewedRelease(viewedRelease)

  await expect(readViewedRelease()).resolves.toEqual(viewedRelease)
  expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(viewedRelease))
  expect(nativeStorageMocks.setItem).not.toHaveBeenCalled()
})

it('should use Apps in Toss storage as the native source of truth', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({...viewedRelease, version: 'stale browser version'}),
  )
  nativeStorageMocks.getItem.mockResolvedValue(JSON.stringify(viewedRelease))
  nativeStorageMocks.setItem.mockResolvedValue(undefined)

  await expect(readViewedRelease()).resolves.toEqual(viewedRelease)
  expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(viewedRelease))
  await expect(writeViewedRelease(viewedRelease)).resolves.toBeUndefined()
  expect(nativeStorageMocks.setItem).not.toHaveBeenCalled()
})

it.each(['2026-09-03T00:52:00+09:00', '2026-09-02T15:57:00Z'])(
  'should preserve the web marker when an incoming release is not newer: %s',
  async (releasedAt) => {
    await writeViewedRelease(viewedRelease)

    await writeViewedRelease({...viewedRelease, releasedAt, version: '2026. 09. 03 00:52'})

    await expect(readViewedRelease()).resolves.toEqual(viewedRelease)
  },
)

it('should advance an older web marker and replace malformed stored data', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({...viewedRelease, releasedAt: 'invalid'}))
  await writeViewedRelease({...viewedRelease, releasedAt: '2026-09-03T00:52:00+09:00'})
  await writeViewedRelease(viewedRelease)

  await expect(readViewedRelease()).resolves.toEqual(viewedRelease)
})

it('should persist native values regardless of a newer browser cache', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({...viewedRelease, releasedAt: '2026-09-04T00:57:00+09:00'}),
  )
  nativeStorageMocks.setItem.mockResolvedValue(undefined)

  await writeViewedRelease(viewedRelease)

  expect(nativeStorageMocks.setItem).toHaveBeenCalledWith(
    STORAGE_KEY,
    JSON.stringify(viewedRelease),
  )
  expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(viewedRelease))
})

it('should ignore a stale browser marker when native storage has no marker', async () => {
  const storage = createStorage()
  vi.mocked(storage.usesTossStorage).mockReturnValue(true)
  vi.mocked(storage.readWeb).mockReturnValue(viewedRelease)
  vi.mocked(storage.readToss).mockResolvedValue(null)
  const repository = createViewedReleaseRepository({storage})

  await expect(repository.read()).resolves.toBeNull()
})

it('should reject malformed stored values', async () => {
  const storage = createStorage()
  vi.mocked(storage.readWeb).mockReturnValue({
    ...viewedRelease,
    releasedAt: '2026-09-03T00:57:00',
  })
  const repository = createViewedReleaseRepository({storage})

  await expect(repository.read()).resolves.toBeNull()
  await expect(
    repository.write({...viewedRelease, releasedAt: '2026-09-03T00:57:00'}),
  ).rejects.toThrow()
})

it('should surface authoritative native read and write failures', async () => {
  const storage = createStorage()
  vi.mocked(storage.usesTossStorage).mockReturnValue(true)
  vi.mocked(storage.readToss).mockRejectedValue(new Error('read unavailable'))
  vi.mocked(storage.writeToss).mockRejectedValue(new Error('write unavailable'))
  const repository = createViewedReleaseRepository({storage})

  await expect(repository.read()).rejects.toThrow('Failed to read viewed version release.')
  vi.mocked(storage.readToss).mockResolvedValue(null)
  await expect(repository.write(viewedRelease)).rejects.toThrow(
    'Failed to persist viewed version release.',
  )
  expect(storage.writeWeb).not.toHaveBeenCalled()
})

it('should surface browser write failures but ignore native cache write failures', async () => {
  const storage = createStorage()
  vi.mocked(storage.writeWeb).mockImplementation(() => {
    throw new Error('browser unavailable')
  })
  const repository = createViewedReleaseRepository({storage})

  await expect(repository.write(viewedRelease)).rejects.toThrow(
    'Failed to persist viewed version release.',
  )

  vi.mocked(storage.usesTossStorage).mockReturnValue(true)
  vi.mocked(storage.readToss).mockResolvedValue(viewedRelease)
  vi.mocked(storage.writeToss).mockResolvedValue(undefined)
  await expect(repository.read()).resolves.toEqual(viewedRelease)
  await expect(repository.write(viewedRelease)).resolves.toBeUndefined()
})

it.each(['2026-09-03T00:52:00+09:00', '2026-09-02T15:57:00Z'])(
  'should preserve the native marker when an incoming release is not newer: %s',
  async (releasedAt) => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    nativeStorageMocks.getItem.mockResolvedValue(JSON.stringify(viewedRelease))

    await writeViewedRelease({...viewedRelease, releasedAt})

    expect(nativeStorageMocks.setItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(viewedRelease))
  },
)

it.each([null, {invalid: true}, {...viewedRelease, releasedAt: '2026-09-03T00:52:00+09:00'}])(
  'should advance missing, malformed or older native markers: %j',
  async (currentValue) => {
    const storage = createStorage()
    vi.mocked(storage.usesTossStorage).mockReturnValue(true)
    vi.mocked(storage.readToss).mockResolvedValue(currentValue)
    const repository = createViewedReleaseRepository({storage})

    await repository.write(viewedRelease)

    expect(storage.writeToss).toHaveBeenCalledWith(viewedRelease)
    expect(storage.writeWeb).toHaveBeenCalledWith(viewedRelease)
  },
)

it.each([true, false])(
  'should serialize overlapping native writes, newest first: %s',
  async (newestFirst) => {
    const storage = createStorage()
    const gate = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    let marker: ViewedRelease | null = null
    vi.mocked(storage.usesTossStorage).mockReturnValue(true)
    vi.mocked(storage.readToss).mockImplementation(async () => marker)
    vi.mocked(storage.writeToss).mockImplementation(async (value) => {
      started.resolve()
      await gate.promise
      marker = value
    })
    const repository = createViewedReleaseRepository({storage})
    const older = {...viewedRelease, releasedAt: '2026-09-03T00:52:00+09:00'}
    const first = repository.write(newestFirst ? viewedRelease : older)
    await started.promise
    const second = repository.write(newestFirst ? older : viewedRelease)
    gate.resolve()
    await Promise.all([first, second])

    expect(marker).toEqual(viewedRelease)
    expect(storage.writeWeb).toHaveBeenLastCalledWith(viewedRelease)
  },
)

it('should reject failed native checks without writing and allow the next queued write', async () => {
  const storage = createStorage()
  vi.mocked(storage.usesTossStorage).mockReturnValue(true)
  vi.mocked(storage.readToss)
    .mockRejectedValueOnce(new Error('read unavailable'))
    .mockResolvedValue(null)
  const repository = createViewedReleaseRepository({storage})

  await expect(repository.write(viewedRelease)).rejects.toThrow(
    'Failed to persist viewed version release.',
  )
  expect(storage.writeToss).not.toHaveBeenCalled()
  await expect(repository.write(viewedRelease)).resolves.toBeUndefined()
  expect(storage.writeToss).toHaveBeenCalledOnce()
})

it('should retain the latest native marker after an older notice is dismissed and storage is read again', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let marker: string | null = null
  nativeStorageMocks.getItem.mockImplementation(async () => marker)
  nativeStorageMocks.setItem.mockImplementation(async (_key, value) => {
    marker = value
  })

  await writeViewedRelease(viewedRelease)
  await writeViewedRelease({...viewedRelease, releasedAt: '2026-09-03T00:52:00+09:00'})

  await expect(readViewedRelease()).resolves.toEqual(viewedRelease)
  expect(nativeStorageMocks.setItem).toHaveBeenCalledOnce()
})

it('should allow a queued native write after persistence fails', async () => {
  const storage = createStorage()
  vi.mocked(storage.usesTossStorage).mockReturnValue(true)
  vi.mocked(storage.readToss).mockResolvedValue(null)
  vi.mocked(storage.writeToss)
    .mockRejectedValueOnce(new Error('write unavailable'))
    .mockResolvedValue(undefined)
  const repository = createViewedReleaseRepository({storage})
  const first = repository.write(viewedRelease)
  const second = repository.write(viewedRelease)

  await expect(first).rejects.toThrow('Failed to persist viewed version release.')
  await expect(second).resolves.toBeUndefined()
  expect(storage.writeWeb).toHaveBeenCalledOnce()
})
