/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {waitFor} from '@solidjs/testing-library'

import type {PictureDiaryEntry} from 'src/features/picture-diary'
import {useEntryEditing} from '../components/memory-assist/picture-diary/use-entry-editing'

const environment = {now: () => new Date('2026-09-04T12:00:00.000Z')}

it('should keep the saved entry in storage when disposal happens after save resolves', async () => {
  const pending = Promise.withResolvers<void>()
  const entry: PictureDiaryEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'edit-entry',
    strokes: [],
    text: '기존 일기',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  }
  const saves: PictureDiaryEntry[] = []
  const repository = {
    save: vi.fn(async (saved: PictureDiaryEntry) => {
      saves.push({...saved})
      await pending.promise
    }),
  }
  const onSaved = vi.fn()
  let dispose!: () => void
  let save!: () => Promise<void>

  createRoot((disposeRoot) => {
    dispose = disposeRoot
    const editing = useEntryEditing({environment, onSaved, repository})
    editing.open(entry)
    editing.editor()?.onTextChange('저장할 수정')
    save = editing.editor()!.onSave
  })

  const saving = save()
  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
  dispose()
  pending.resolve()
  await saving

  expect(saves).toHaveLength(2)
  expect(saves[0]?.text).toBe('저장할 수정')
  expect(saves[0]?.updatedAt).toBe('2026-09-04T12:00:00.000Z')
  expect(saves.at(-1)).toEqual(saves[0])
  expect(onSaved).not.toHaveBeenCalled()
})
