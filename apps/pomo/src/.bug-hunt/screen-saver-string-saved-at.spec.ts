/** @vitest-environment jsdom */
import {beforeEach, expect, it} from 'vitest'

import {readScreenSaverDelay, SCREEN_SAVER_STORAGE_KEY} from '../features/screen-saver/storage'

beforeEach(() => {
  localStorage.clear()
})

it('should restore the screen saver delay when savedAt is persisted as a JSON string', async () => {
  localStorage.setItem(
    SCREEN_SAVER_STORAGE_KEY,
    JSON.stringify({delay: 'off', savedAt: '1696000000000'}),
  )

  await expect(readScreenSaverDelay()).resolves.toBe('off')
})
