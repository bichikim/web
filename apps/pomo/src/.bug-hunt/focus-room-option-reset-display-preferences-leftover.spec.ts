/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {createRuntimeOptionResetManager} from 'src/features/dev-option-reset'
import {DISPLAY_PREFERENCES_STORAGE_KEY} from 'src/features/focus-room-display-preferences'

it('should clear focus-room display preferences when focus-room options are reset', async () => {
  const hiddenPreferences = JSON.stringify({
    dialogueComposerVisible: false,
    featureRequestVisible: false,
    memoryAssistVisible: false,
    playerVisible: false,
    pomodoroVisible: false,
    toolsButtonVisible: false,
    tourButtonVisible: false,
  })
  localStorage.setItem(DISPLAY_PREFERENCES_STORAGE_KEY, hiddenPreferences)

  await expect(createRuntimeOptionResetManager().reset('focus-room')).resolves.toEqual({
    status: 'complete',
  })

  expect(localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)).toBeNull()
})
