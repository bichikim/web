/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it} from 'vitest'

import {readFocusRoomEntrySession, writeFocusRoomEntrySession} from '..'

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
})
