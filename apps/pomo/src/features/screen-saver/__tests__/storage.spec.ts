import {describe, expect, it, vi} from 'vitest'

import {createScreenSaverRepository, type ScreenSaverStorage} from '../storage'

const createStorage = () => {
  let web: unknown = '10m'
  let native: unknown = '10m'
  return {
    isNative: (): boolean => true,
    readNative: vi.fn(async () => native),
    readWeb: vi.fn(() => web),
    removeWeb: vi.fn(() => {
      web = null
      return null as unknown
    }),
    writeNative: vi.fn(async (_key: string, value: unknown) => {
      native = value
    }),
    writeWeb: vi.fn((_key: string, value: unknown) => {
      web = value
      return null as unknown
    }),
  } satisfies ScreenSaverStorage
}

describe('createScreenSaverRepository', () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    'should preserve persistence semantics with web failure %s and native failure %s',
    async (webFails, nativeFails) => {
      const storage = createStorage()
      const repository = createScreenSaverRepository(storage)
      if (webFails) {
        storage.writeWeb.mockReturnValue(new Error('web unavailable'))
      }
      if (nativeFails) {
        storage.writeNative.mockRejectedValue(new Error('native unavailable'))
      }

      const write = repository.write('off')
      if (webFails && nativeFails) {
        await expect(write).rejects.toThrow('Failed to persist screen saver delay.')
        expect(await repository.read()).toBe('10m')
        expect(storage.removeWeb).not.toHaveBeenCalled()
      } else {
        await write
        expect(await createScreenSaverRepository(storage).read()).toBe('off')
      }
    },
  )

  it('should use only web persistence outside the host app and report its failure', async () => {
    const storage = createStorage()
    storage.isNative = () => false
    const repository = createScreenSaverRepository(storage)
    await repository.write('off')
    expect(await repository.read()).toBe('off')
    storage.writeWeb.mockReturnValue(new Error('web unavailable'))
    await expect(repository.write('1h')).rejects.toThrow('Failed to persist screen saver delay.')
    expect(storage.writeNative).not.toHaveBeenCalled()
  })

  it('should preserve a web-only choice on dual failure and recover the write queue', async () => {
    const storage = createStorage()
    const repository = createScreenSaverRepository(storage)
    storage.writeNative.mockRejectedValueOnce(new Error('native unavailable'))
    await repository.write('off')
    storage.writeWeb.mockReturnValueOnce(new Error('web unavailable'))
    storage.writeNative.mockRejectedValueOnce(new Error('native unavailable'))
    await expect(repository.write('1m')).rejects.toThrow('Failed to persist screen saver delay.')
    expect(await repository.read()).toBe('off')
    await repository.write('1h')
    expect(await repository.read()).toBe('1h')
  })

  it('should report failure if a native replacement cannot invalidate the web copy', async () => {
    const storage = createStorage()
    storage.writeWeb.mockReturnValue(new Error('web unavailable'))
    storage.removeWeb.mockReturnValue(new Error('removal unavailable'))
    const repository = createScreenSaverRepository(storage)
    await expect(repository.write('off')).rejects.toThrow('Failed to persist screen saver delay.')
    expect(await storage.readNative()).toBe('off')
    expect(await repository.read()).toBe('10m')
  })

  it('should serialize complete writes and wait for them before reading', async () => {
    const storage = createStorage()
    const completion = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    storage.writeWeb.mockReturnValueOnce(new Error('web unavailable'))
    storage.writeNative.mockImplementationOnce(async () => {
      started.resolve()
      await completion.promise
    })
    const repository = createScreenSaverRepository(storage)
    const first = repository.write('1m')
    await started.promise
    const second = repository.write('off')
    const read = repository.read()
    expect(storage.writeWeb).toHaveBeenCalledTimes(1)
    completion.resolve()
    await Promise.all([first, second])
    expect(await read).toBe('off')
    expect(storage.writeNative.mock.calls.map((call) => call[1])).toEqual(['1m', 'off'])
  })

  it.each(['value', 'missing', 'error'] as const)(
    'should retry a late native read returning %s after a new write',
    async (outcome) => {
      const storage = createStorage()
      storage.readWeb.mockReturnValueOnce(null)
      const completion = Promise.withResolvers<unknown>()
      const started = Promise.withResolvers<void>()
      storage.readNative.mockImplementationOnce(() => {
        started.resolve()
        return completion.promise
      })
      const repository = createScreenSaverRepository(storage)
      const read = repository.read()
      await started.promise
      await repository.write('off')
      switch (outcome) {
        case 'value':
          completion.resolve('20m')
          break
        case 'missing':
          completion.resolve(null)
          break
        case 'error':
          completion.reject(new Error('native unavailable'))
          break
      }
      expect(await read).toBe('off')
    },
  )

  it.each([null, 'invalid', '20m'])(
    'should validate native restoration of %s and rebuild the web copy',
    async (value) => {
      const storage = createStorage()
      storage.readWeb.mockReturnValue(null)
      storage.readNative.mockResolvedValue(value)
      expect(await createScreenSaverRepository(storage).read()).toBe(
        value === '20m' ? '20m' : '10m',
      )
      if (value === '20m') {
        expect(storage.writeWeb).toHaveBeenCalledWith('pomo:screen-saver-delay:v1', '20m')
      }
    },
  )

  it('should default when native reading fails', async () => {
    const storage = createStorage()
    storage.readWeb.mockReturnValue(null)
    storage.readNative.mockRejectedValue(new Error('native unavailable'))
    expect(await createScreenSaverRepository(storage).read()).toBe('10m')
  })

  it('should keep separate repositories independent while one has a pending write', async () => {
    const firstStorage = createStorage()
    const completion = Promise.withResolvers<void>()
    firstStorage.writeNative.mockReturnValue(completion.promise)
    const first = createScreenSaverRepository(firstStorage)
    const second = createScreenSaverRepository(createStorage())
    const pending = first.write('1h')
    await second.write('off')
    expect(await second.read()).toBe('off')
    completion.resolve()
    await pending
    expect(await first.read()).toBe('1h')
  })
})
