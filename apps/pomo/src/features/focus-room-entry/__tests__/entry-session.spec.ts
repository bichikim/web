/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type FocusRoomEntrySessionStorage,
  readFocusRoomEntrySession,
  writeFocusRoomEntrySession,
} from '..'

describe('focus room entry session', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('should report an incomplete entry when the session has no saved value', () => {
    expect(readFocusRoomEntrySession()).toBe(false)
  })

  it('should remember a completed entry for the current session', () => {
    writeFocusRoomEntrySession()

    expect(readFocusRoomEntrySession()).toBe(true)
    expect(sessionStorage.getItem('pomo:focus-room-entry:v1')).toBe('true')
  })

  it('should remain available when browser session storage fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    expect(readFocusRoomEntrySession()).toBe(false)

    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    expect(() => writeFocusRoomEntrySession()).not.toThrow()
  })

  it('should persist through an injected session store', () => {
    const values = new Map<string, string>()
    const storage: FocusRoomEntrySessionStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    }

    expect(readFocusRoomEntrySession(storage)).toBe(false)
    writeFocusRoomEntrySession(storage)
    expect(readFocusRoomEntrySession(storage)).toBe(true)
  })
})
