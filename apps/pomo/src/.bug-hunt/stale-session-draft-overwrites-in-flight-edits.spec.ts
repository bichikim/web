/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getDialogueDraftKey, writeDialogueDraft} from '../features/focus-room-dialogue/dialogue-draft'
import {
  createEditorRoot,
  createStoredDialogue,
  repositoryMocks,
} from '../features/focus-room-dialogue/__tests__/support/editor'

describe('bug-hunt: stale session draft after load', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should not restore a navigation-time session draft over newer in-flight edits', async () => {
    const deferred = Promise.withResolvers<ReturnType<typeof createStoredDialogue>>()
    writeDialogueDraft(getDialogueDraftKey('a'), 'draft-from-session')
    repositoryMocks.getDialogue.mockImplementation(async (id) => {
      if (id === 'a') {
        return deferred.promise
      }
      return createStoredDialogue(id, `text-${id}`)
    })
    repositoryMocks.getAudio.mockResolvedValue(new Blob(['stored audio']))

    const editor = createEditorRoot('a')
    await vi.waitFor(() => expect(repositoryMocks.getDialogue).toHaveBeenCalledWith('a'))

    editor.controller.setText('user-typed-during-load')
    deferred.resolve(createStoredDialogue('a', 'text-a'))
    await vi.waitFor(() => expect(editor.controller.state().status).toBe('idle'))
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(editor.controller.text()).toBe('user-typed-during-load')
    editor.dispose()
  })
})
