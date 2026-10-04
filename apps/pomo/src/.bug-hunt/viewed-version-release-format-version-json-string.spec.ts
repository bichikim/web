/** @vitest-environment jsdom */
import {beforeEach, describe, expect, it} from 'vitest'

import {readViewedRelease} from '../features/version-catalog/viewed-release-storage'

const STORAGE_KEY = 'pomo:viewed-version-release:v1'

describe('viewed version release formatVersion JSON string', () => {
  beforeEach(() => localStorage.clear())

  it('should restore a viewed release when formatVersion is stored as the string "1"', async () => {
    const stored = {
      formatVersion: '1',
      releasedAt: '2026-09-01T12:00:00+09:00',
      version: '2026. 09. 01 12:00',
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    await expect(readViewedRelease()).resolves.toEqual({
      formatVersion: 1,
      releasedAt: stored.releasedAt,
      version: stored.version,
    })
  })
})
