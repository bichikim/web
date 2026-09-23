import {describe, expect, it, vi} from 'vitest'

import {createScreenSaverRepository, type ScreenSaverStorage} from '../storage'

const STORAGE_KEY = 'pomo:screen-saver-delay:v1'

const createStorage = () => {
  let web: unknown = '10m'
  let native: unknown = '10m'
  return {
    readToss: vi.fn(async () => native),
    readWeb: vi.fn(() => web),
    removeWeb: vi.fn(() => {
      web = null
      return null as unknown
    }),
    usesTossStorage: (): boolean => true,
    writeToss: vi.fn(async (_key: string, value: unknown) => {
      native = value
    }),
    writeWeb: vi.fn((_key: string, value: unknown) => {
      web = value
      return null as unknown
    }),
  } satisfies ScreenSaverStorage
}

const stored = (delay: string, savedAt: number) => ({delay, savedAt})
const createRepository = (storage: ScreenSaverStorage) =>
  createScreenSaverRepository(storage, () => 100)

describe('createScreenSaverRepository', () => {
  it('should repair native storage before restoring an evicted web preference', async () => {
    const storage = createStorage()
    storage.writeWeb(STORAGE_KEY, stored('off', 10))
    const repository = createRepository(storage)

    expect(await repository.read()).toBe('off')
    storage.removeWeb()
    expect(await repository.read()).toBe('off')
    expect(await storage.readToss()).toEqual(stored('off', 10))
  })

  it('should prefer a newer native preference over a stale browser cache', async () => {
    const storage = createStorage()
    storage.writeWeb(STORAGE_KEY, stored('off', 10))
    storage.readToss.mockResolvedValue(stored('1h', 20))
    const repository = createRepository(storage)

    expect(await repository.read()).toBe('1h')
    expect(storage.writeWeb).toHaveBeenLastCalledWith(STORAGE_KEY, stored('1h', 20))
    expect(storage.readToss).toHaveBeenCalledOnce()
    expect(storage.writeToss).not.toHaveBeenCalled()
  })

  it('should prefer the native preference when legacy copies have no timestamps', async () => {
    const storage = createStorage()
    storage.writeWeb(STORAGE_KEY, 'off')
    const repository = createRepository(storage)

    expect(await repository.read()).toBe('10m')
    expect(storage.writeWeb).toHaveBeenLastCalledWith(STORAGE_KEY, stored('10m', 0))
  })

  it('should retain the web choice after repair failure and retry on the next read', async () => {
    const storage = createStorage()
    storage.writeWeb(STORAGE_KEY, stored('off', 10))
    storage.writeToss.mockRejectedValueOnce(new Error('native unavailable'))
    const repository = createRepository(storage)

    expect(await repository.read()).toBe('off')
    expect(await repository.read()).toBe('off')
    storage.removeWeb()
    expect(await repository.read()).toBe('off')
  })

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    'should preserve persistence semantics with web failure %s and native failure %s',
    async (webFails, nativeFails) => {
      const storage = createStorage()
      const repository = createRepository(storage)
      if (webFails) {
        storage.writeWeb.mockReturnValue(new Error('web unavailable'))
      }
      if (nativeFails) {
        storage.writeToss.mockRejectedValue(new Error('native unavailable'))
      }

      const write = repository.write('off')
      if (webFails && nativeFails) {
        await expect(write).rejects.toThrow('Failed to persist screen saver delay.')
        expect(await repository.read()).toBe('10m')
        expect(storage.removeWeb).not.toHaveBeenCalled()
      } else {
        await write
        expect(await createRepository(storage).read()).toBe('off')
      }
    },
  )

  it('should use only web persistence outside the host app and report its failure', async () => {
    const storage = createStorage()
    storage.usesTossStorage = () => false
    const repository = createRepository(storage)
    await repository.write('off')
    expect(await repository.read()).toBe('off')
    storage.writeWeb.mockReturnValue(new Error('web unavailable'))
    await expect(repository.write('1h')).rejects.toThrow('Failed to persist screen saver delay.')
    expect(storage.writeToss).not.toHaveBeenCalled()
  })

  it('should preserve a web-only choice on dual failure and recover the write queue', async () => {
    const storage = createStorage()
    const repository = createRepository(storage)
    storage.writeToss.mockRejectedValueOnce(new Error('native unavailable'))
    await repository.write('off')
    storage.writeWeb.mockReturnValueOnce(new Error('web unavailable'))
    storage.writeToss.mockRejectedValueOnce(new Error('native unavailable'))
    await expect(repository.write('1m')).rejects.toThrow('Failed to persist screen saver delay.')
    expect(await repository.read()).toBe('off')
    await repository.write('1h')
    expect(await repository.read()).toBe('1h')
  })

  it('should report failure if a native replacement cannot invalidate the web copy', async () => {
    const storage = createStorage()
    storage.writeWeb.mockReturnValue(new Error('web unavailable'))
    storage.removeWeb.mockReturnValue(new Error('removal unavailable'))
    const repository = createRepository(storage)
    await expect(repository.write('off')).rejects.toThrow('Failed to persist screen saver delay.')
    expect(await storage.readToss()).toMatchObject({delay: 'off', savedAt: expect.any(Number)})
    expect(await repository.read()).toBe('off')
  })

  it.each([null, 'invalid', '20m'])(
    'should validate native restoration of %s and rebuild the web copy',
    async (value) => {
      const storage = createStorage()
      storage.readWeb.mockReturnValue(null)
      storage.readToss.mockResolvedValue(value)
      expect(await createRepository(storage).read()).toBe(value === '20m' ? '20m' : '10m')
      if (value === '20m') {
        expect(storage.writeWeb).toHaveBeenCalledWith(STORAGE_KEY, stored('20m', 0))
      }
    },
  )

  it('should default when native reading fails', async () => {
    const storage = createStorage()
    storage.readWeb.mockReturnValue(null)
    storage.readToss.mockRejectedValue(new Error('native unavailable'))
    expect(await createRepository(storage).read()).toBe('10m')
  })

  it('should keep separate repositories independent while one has a pending write', async () => {
    const firstStorage = createStorage()
    const completion = Promise.withResolvers<void>()
    firstStorage.writeToss.mockReturnValue(completion.promise)
    const first = createRepository(firstStorage)
    const second = createRepository(createStorage())
    const pending = first.write('1h')
    await second.write('off')
    expect(await second.read()).toBe('off')
    completion.resolve()
    await pending
    expect(await first.read()).toBe('1h')
  })
})
