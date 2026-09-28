/** @vitest-environment jsdom */
import {webcrypto} from 'node:crypto'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {DEFAULT_BACKGROUND} from '../features/background/model'
import {createNativeRepository} from '../features/background/native-repository'

vi.mock('@apps-in-toss/web-framework', () => ({Storage: {getItem: vi.fn(), setItem: vi.fn()}}))

let manifest: string | null = null

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  manifest = null
  vi.stubGlobal('caches', {
    open: vi.fn(async () => ({
      delete: vi.fn(),
      match: vi.fn(),
      put: vi.fn(),
    })),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should fall back to defaults when native background manifest JSON is invalid', async () => {
  manifest = '{invalid'
  const repository = createNativeRepository({
    storage: {
      getItem: vi.fn(async () => manifest),
      setItem: vi.fn(),
    },
  })

  await expect(repository.read()).resolves.toEqual({
    items: [],
    preferences: DEFAULT_BACKGROUND,
  })
})
