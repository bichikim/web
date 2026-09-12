// oxlint-disable require-yield -- Rejection coverage needs an async generator that fails before its first value.
import {describe, expect, it, vi} from 'vitest'

import type {PDialogue} from '../schema'
import {createEditorRoot, createStoredDialogue, repositoryMocks} from './support/editor'

describe('usePDialogueEditor', () => {
  it('should switch saved dialogues and keep drafts scoped to the selected route', async () => {
    repositoryMocks.getDialogue.mockImplementation(async (id) =>
      createStoredDialogue(id, `text-${id}`),
    )
    repositoryMocks.getAudio.mockResolvedValue(new Blob(['stored audio']))
    const editor = createEditorRoot('a')
    await vi.waitFor(() => expect(editor.controller.text()).toBe('text-a'))
    editor.controller.setText('draft-a')
    editor.navigate('b')
    await vi.waitFor(() => expect(editor.controller.text()).toBe('text-b'))
    expect(editor.controller.dialogueId()).toBe('b')
    await expect(editor.controller.save()).resolves.toBe('b')
    expect(repositoryMocks.saveDialogue).toHaveBeenLastCalledWith({
      audio: undefined,
      dialogue: expect.objectContaining({id: 'b', text: 'text-b'}),
    })
    editor.navigate('a')
    await vi.waitFor(() => expect(editor.controller.text()).toBe('draft-a'))
    expect(editor.controller.audioUrl()).toBeNull()
    editor.navigate(null)
    expect(editor.controller.text()).toBe('')
    expect(editor.controller.dialogueId()).toBeNull()
    expect(editor.controller.segments()).toEqual([])
    expect(editor.controller.durationMs()).toBe(0)
    editor.controller.setText('new draft')
    editor.navigate('b')
    await vi.waitFor(() => expect(editor.controller.text()).toBe('text-b'))
    editor.navigate(null)
    expect(editor.controller.text()).toBe('new draft')
    editor.dispose()
  })

  it.each(['metadata', 'audio', 'failure'])(
    'should ignore stale %s after navigation',
    async (phase) => {
      const deferred = Promise.withResolvers<PDialogue | Blob | null>()
      repositoryMocks.getDialogue.mockImplementation(async (id) => {
        if (id === 'a' && phase !== 'audio') {
          return deferred.promise
        }
        return createStoredDialogue(id, `text-${id}`)
      })
      repositoryMocks.getAudio.mockImplementation(async (key) =>
        key === 'a-audio' ? deferred.promise : new Blob(['audio-b']),
      )
      const editor = createEditorRoot('a')
      await vi.waitFor(() => expect(repositoryMocks.getDialogue).toHaveBeenCalledWith('a'))
      if (phase === 'audio') {
        await vi.waitFor(() => expect(repositoryMocks.getAudio).toHaveBeenCalledWith('a-audio'))
      }
      editor.navigate('b')
      await vi.waitFor(() => expect(editor.controller.text()).toBe('text-b'))
      if (phase === 'failure') {
        deferred.reject(new Error('stale failure'))
      } else {
        deferred.resolve(phase === 'audio' ? new Blob(['audio-a']) : createStoredDialogue('a'))
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 0)
      })
      expect(editor.controller.text()).toBe('text-b')
      expect(editor.controller.state().status).toBe('idle')
      editor.dispose()
    },
  )

  it('should keep the selected dialogue when an earlier save completes', async () => {
    repositoryMocks.getDialogue.mockImplementation(async (id) =>
      createStoredDialogue(id, `text-${id}`),
    )
    repositoryMocks.getAudio.mockResolvedValue(new Blob(['audio']))
    const pending = Promise.withResolvers<undefined>()
    repositoryMocks.saveDialogue.mockReturnValueOnce(pending.promise)
    const editor = createEditorRoot('a')
    await vi.waitFor(() => expect(editor.controller.canSave()).toBe(true))
    const saving = editor.controller.save()
    editor.navigate('b')
    await vi.waitFor(() => expect(editor.controller.text()).toBe('text-b'))
    pending.resolve(undefined)
    await expect(saving).resolves.toBeNull()
    expect(editor.controller.dialogueId()).toBe('b')
    expect(editor.controller.state().status).toBe('idle')
    editor.dispose()
  })

  it('should clear previous audio when navigating to a missing dialogue', async () => {
    repositoryMocks.getDialogue
      .mockResolvedValueOnce(createStoredDialogue('a'))
      .mockResolvedValueOnce(null)
    repositoryMocks.getAudio.mockResolvedValueOnce(new Blob(['audio']))
    const editor = createEditorRoot('a')
    await vi.waitFor(() => expect(editor.controller.canSave()).toBe(true))
    editor.navigate('missing')
    expect(editor.controller.audioUrl()).toBeNull()
    expect(editor.controller.canSave()).toBe(false)
    await vi.waitFor(() => expect(editor.controller.state().status).toBe('error'))
    expect(editor.controller.text()).toBe('')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:dialogue')
    editor.dispose()
  })
})
