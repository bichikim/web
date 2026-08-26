import {expect, it} from 'vitest'

import {type DialogueEditorState, isDialogueEditorBusy} from '../dialogue-editor-state'

it.each([
  ['analyzing', true],
  ['generating', true],
  ['loading', true],
  ['preparing', true],
  ['saving', true],
  ['error', false],
  ['idle', false],
  ['ready', false],
] as const)('should classify %s editor state busy=%s', (status, expected) => {
  const state = {message: status, progress: 0, status} as DialogueEditorState

  expect(isDialogueEditorBusy(state)).toBe(expected)
})
