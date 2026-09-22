/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {
  createViewedReleaseRepository,
  type VersionNoticeStorage,
  type ViewedRelease,
} from '../features/version-catalog/viewed-release-storage'

const viewedRelease = {
  formatVersion: 1,
  releasedAt: '2026-09-03T00:57:00+09:00',
  version: '2026. 09. 03 00:57',
} as const satisfies ViewedRelease

it('should keep the viewed release readable from web after the native bridge is gone', async () => {
  let usesToss = true
  const storage: VersionNoticeStorage = {
    readToss: vi.fn(async () => viewedRelease),
    readWeb: vi.fn(() => null),
    usesTossStorage: () => usesToss,
    writeToss: vi.fn(async () => undefined),
    writeWeb: vi.fn(() => {
      throw new Error('QuotaExceededError')
    }),
  }
  const repository = createViewedReleaseRepository({storage})

  await expect(repository.read()).resolves.toEqual(viewedRelease)

  usesToss = false

  await expect(repository.read()).resolves.toEqual(viewedRelease)
})
