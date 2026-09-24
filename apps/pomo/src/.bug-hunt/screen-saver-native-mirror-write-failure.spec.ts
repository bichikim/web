/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {createScreenSaverRepository, type ScreenSaverStorage} from '../features/screen-saver/storage'

const STORAGE_KEY = 'pomo:screen-saver-delay:v1'
const stored = (delay: string, savedAt: number) => ({delay, savedAt})

describe('screen saver native mirror write failure on read', () => {
  it('should not fall back to a stale web copy after a failed native-to-web repair', async () => {
    let web: unknown = stored('off', 10)
    let native: unknown = stored('1h', 20)
    const storage = {
      readToss: vi.fn(async () => native),
      readWeb: vi.fn(() => web),
      removeWeb: vi.fn(() => null as unknown),
      usesTossStorage: (): boolean => true,
      writeToss: vi.fn(async (_key: string, value: unknown) => {
        native = value
      }),
      writeWeb: vi.fn(() => new Error('QuotaExceededError')),
    } satisfies ScreenSaverStorage

    const repository = createScreenSaverRepository(storage, () => 100)

    await expect(repository.read()).resolves.toBe('1h')
    expect(storage.writeWeb).toHaveBeenCalledWith(STORAGE_KEY, stored('1h', 20))

    storage.usesTossStorage = () => false

    await expect(repository.read()).resolves.toBe('1h')
  })
})
