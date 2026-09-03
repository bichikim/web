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
    isNative: vi.fn(() => false),
    readNative: vi.fn(),
    readWeb: vi.fn(() => null),
    writeNative: vi.fn(),
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
  expect(nativeStorageMocks.setItem).toHaveBeenCalledWith(
    STORAGE_KEY,
    JSON.stringify(viewedRelease),
  )
})

it('should ignore a stale browser marker when native storage has no marker', async () => {
  const storage = createStorage()
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.readWeb).mockReturnValue(viewedRelease)
  vi.mocked(storage.readNative).mockResolvedValue(null)
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
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.readNative).mockRejectedValue(new Error('read unavailable'))
  vi.mocked(storage.writeNative).mockRejectedValue(new Error('write unavailable'))
  const repository = createViewedReleaseRepository({storage})

  await expect(repository.read()).rejects.toThrow('Failed to read viewed version release.')
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

  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.readNative).mockResolvedValue(viewedRelease)
  vi.mocked(storage.writeNative).mockResolvedValue(undefined)
  await expect(repository.read()).resolves.toEqual(viewedRelease)
  await expect(repository.write(viewedRelease)).resolves.toBeUndefined()
})
