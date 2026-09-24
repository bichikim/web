/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {
  createDisplayThemePreferenceRepository,
  type DisplayThemePreferenceStorage,
} from '../features/display-theme/storage'

const stored = (preference: 'dark' | 'bright', savedAt: number) => ({preference, savedAt})

describe('display theme native mirror write failure on read', () => {
  it('should not fall back to a stale web copy after a failed native-to-web repair', async () => {
    let web: unknown = stored('bright', 10)
    let native: unknown = stored('dark', 20)
    let usesTossStorage = true
    const storage: DisplayThemePreferenceStorage = {
      readToss: vi.fn(async () => native),
      readWeb: vi.fn(() => web),
      removeWeb: vi.fn(() => null),
      usesTossStorage: () => usesTossStorage,
      writeToss: vi.fn(async (_key, value) => {
        native = value
      }),
      writeWeb: vi.fn(() => {
        throw new Error('QuotaExceededError')
      }),
    }

    const repository = createDisplayThemePreferenceRepository({now: () => 100, storage})

    await expect(repository.read()).resolves.toBe('dark')

    usesTossStorage = false

    await expect(repository.read()).resolves.toBe('dark')
  })
})
