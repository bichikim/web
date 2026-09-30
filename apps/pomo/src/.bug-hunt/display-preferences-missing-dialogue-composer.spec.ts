/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parsePDisplayPreferences} from '../features/focus-room-display-preferences/storage'

it('should preserve hidden widget flags when dialogueComposerVisible is absent from stored JSON', () => {
  expect(
    parsePDisplayPreferences({
      featureRequestVisible: false,
      memoryAssistVisible: false,
      playerVisible: false,
      pomodoroVisible: false,
      toolsButtonVisible: false,
      tourButtonVisible: true,
    }),
  ).toEqual({
    dialogueComposerVisible: true,
    featureRequestVisible: false,
    memoryAssistVisible: false,
    playerVisible: false,
    pomodoroVisible: false,
    toolsButtonVisible: false,
    tourButtonVisible: true,
  })
})
