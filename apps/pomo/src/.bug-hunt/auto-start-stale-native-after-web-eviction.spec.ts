/** @vitest-environment node */

import {describe, expect, it, vi} from 'vitest'

import {
  createAutoStartStorage,
  type AutoStartStorageAdapter,
} from '../features/pomodoro-timer/auto-start-storage'

describe('auto-start stale native after web eviction (bug hunt)', () => {
  it('should not restore an older native value after a newer write when web storage was cleared', async () => {
    const now = vi.fn<() => number>()
    now.mockReturnValueOnce(100).mockReturnValueOnce(200)
    let web: string | null = null
    let native: string | null = null
    const pendingFirst = Promise.withResolvers<void>()
    const storage = {
      readToss: vi.fn(async (_key, parse) => {
        if (native === null) {
          return null
        }
        return parse(JSON.parse(native))
      }),
      readWeb: vi.fn((_key, parse) => {
        if (web === null) {
          return null
        }
        return parse(JSON.parse(web))
      }),
      usesTossStorage: () => true,
      writeToss: vi.fn(async (_key, value) => {
        const serialized = JSON.stringify(value)
        if (serialized.includes('"savedAt":100')) {
          await pendingFirst.promise
        }
        native = serialized
      }),
      writeWeb: vi.fn((_key, value) => {
        web = JSON.stringify(value)
        return null
      }),
    } satisfies AutoStartStorageAdapter

    const repository = createAutoStartStorage({now, storage})
    const first = repository.write(true)
    const second = repository.write(false)
    await second
    pendingFirst.resolve()
    await first

    web = null
    await expect(repository.read()).resolves.toBe(false)
  })
})
