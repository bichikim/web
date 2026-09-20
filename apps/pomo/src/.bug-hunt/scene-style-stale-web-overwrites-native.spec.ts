/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {
  createPSceneStyleRepository,
  type PSceneStyleStorage,
} from '../features/focus-room-animation/style-storage'

const createStorage = (web: unknown, native: unknown) =>
  ({
    getDefault: () => 'original' as const,
    readToss: vi.fn(async () => native),
    readWeb: vi.fn(() => web),
    usesTossStorage: () => true,
    writeToss: vi.fn(async (_key: string, value: unknown) => {
      native = value
    }),
    writeWeb: vi.fn((_key: string, value: unknown) => {
      web = value
    }),
  }) satisfies PSceneStyleStorage

describe('bug hunt: scene style native preference lost to stale web cache', () => {
  it('should prefer the native scene style when web localStorage is stale', async () => {
    let native: unknown = '"scribble"'
    let web: unknown = '"original"'
    const storage = createStorage(web, native)
    storage.writeToss = vi.fn(async (_key: string, value: unknown) => {
      native = value
    })

    const repository = createPSceneStyleRepository(storage)

    await expect(repository.read()).resolves.toBe('scribble')
    expect(storage.writeToss).not.toHaveBeenCalled()
  })
})
