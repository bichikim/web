/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {readPScenePreferences, writePScenePreferences} from '../features/focus-room-scene-preferences/storage'

const preferences = {
  activity: 'typing',
  gaze: 'user',
  timeMode: 'night',
} as const

describe('focus-room scene preferences web persistence', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('should reject when browser storage refuses to persist preferences', async () => {
    const storageError = new DOMException('The operation is insecure.', 'SecurityError')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw storageError
    })

    await expect(writePScenePreferences(preferences)).rejects.toThrow(
      'Failed to persist scene preferences.',
    )

    await expect(readPScenePreferences()).resolves.toEqual({
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    })
  })
})
