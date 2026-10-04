/** @vitest-environment jsdom */
import {beforeEach, describe, expect, it} from 'vitest'

import {readPDisplayPreferences} from '../features/focus-room-display-preferences/storage'

const STORAGE_KEY = 'pomo:focus-room-display-preferences:v1'

describe('focus-room display preferences boolean JSON strings', () => {
  beforeEach(() => localStorage.clear())

  it('should keep explicit visibility flags when one boolean field is stored as a JSON string', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        dialogueComposerVisible: true,
        featureRequestVisible: true,
        memoryAssistVisible: true,
        playerVisible: 'true',
        pomodoroVisible: false,
        toolsButtonVisible: true,
        tourButtonVisible: true,
      }),
    )

    await expect(readPDisplayPreferences()).resolves.toEqual({
      dialogueComposerVisible: true,
      featureRequestVisible: true,
      memoryAssistVisible: true,
      playerVisible: true,
      pomodoroVisible: false,
      toolsButtonVisible: true,
      tourButtonVisible: true,
    })
  })
})
