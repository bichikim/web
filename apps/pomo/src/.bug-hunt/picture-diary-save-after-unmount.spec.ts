/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {createPictureDiaryEntry} from '../features/picture-diary'
import {useEntryEditing} from '../components/memory-assist/picture-diary/use-entry-editing'

afterEach(() => {
  cleanup()
})

it('should ignore an in-flight save after the editor unmounts', async () => {
  const persistence = Promise.withResolvers<void>()
  const onSaved = vi.fn()
  const repository = {
    delete: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockReturnValue(persistence.promise),
  }
  const entry = createPictureDiaryEntry({
    createdAt: '2026-09-12T09:00:00.000Z',
    date: '2026-09-12',
    id: 'entry-1',
    now: new Date('2026-09-12T09:00:00Z'),
    strokes: [],
    text: 'Draft entry',
  })

  const view = renderHook(() =>
    useEntryEditing({
      environment: {now: () => new Date('2026-09-12T09:00:00Z')},
      onSaved,
      repository,
    }),
  )

  view.result.open(entry)
  const saving = view.result.editor()?.onSave()
  view.cleanup()
  persistence.resolve()
  await saving

  expect(onSaved).not.toHaveBeenCalled()
})
