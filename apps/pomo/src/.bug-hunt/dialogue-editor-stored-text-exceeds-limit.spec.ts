/** @vitest-environment jsdom */
import {describe, expect, it, vi} from 'vitest'

import {
  createEditorRoot,
  createStoredDialogue,
  repositoryMocks,
} from '../features/focus-room-dialogue/__tests__/support/editor'

const MAXIMUM_DIALOGUE_EDITOR_TEXT_LENGTH = 10_000

describe('focus room dialogue editor text limit', () => {
  it('should clamp stored dialogue text to the editor maximum length', async () => {
    const longText = '가'.repeat(MAXIMUM_DIALOGUE_EDITOR_TEXT_LENGTH + 1)
    repositoryMocks.getDialogue.mockResolvedValue(createStoredDialogue('long-dialogue', longText))
    repositoryMocks.getAudio.mockResolvedValue(new Blob(['stored audio']))

    const editor = createEditorRoot('long-dialogue')
    await vi.waitFor(() =>
      expect(editor.controller.text().length).toBe(MAXIMUM_DIALOGUE_EDITOR_TEXT_LENGTH + 1),
    )

    expect(editor.controller.text().length).toBeLessThanOrEqual(MAXIMUM_DIALOGUE_EDITOR_TEXT_LENGTH)
    editor.dispose()
  })
})
