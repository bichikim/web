/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {createScreenSaverRepository, type ScreenSaverStorage} from '../features/screen-saver/storage'

const createStorage = (web: unknown, native: unknown) =>
  ({
    readToss: vi.fn(async () => native),
    readWeb: vi.fn(() => web),
    removeWeb: vi.fn(() => null),
    usesTossStorage: () => true,
    writeToss: vi.fn(async (_key: string, value: unknown) => {
      native = value
    }),
    writeWeb: vi.fn((_key: string, value: unknown) => {
      web = value
      return null
    }),
  }) satisfies ScreenSaverStorage

describe('bug hunt: screen saver native preference lost to stale web cache', () => {
  it('should prefer the native screen saver delay when web localStorage is stale', async () => {
    let native: unknown = '"off"'
    let web: unknown = '"10m"'
    const storage = createStorage(web, native)
    storage.writeToss = vi.fn(async (_key: string, value: unknown) => {
      native = value
    })

    const repository = createScreenSaverRepository(storage)

    await expect(repository.read()).resolves.toBe('off')
    expect(storage.writeToss).not.toHaveBeenCalled()
  })
})
