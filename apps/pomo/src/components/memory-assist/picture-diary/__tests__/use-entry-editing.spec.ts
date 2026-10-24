import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import type {PictureDiaryEntry, PictureDiaryRepository} from 'src/features/picture-diary'
import {useEntryEditing} from '../use-entry-editing'

const entry: PictureDiaryEntry = {
  createdAt: '2026-09-04T03:00:00.000Z',
  date: '2026-09-04',
  id: 'existing-entry',
  strokes: [],
  text: 'Original diary',
  updatedAt: '2026-09-04T03:00:00.000Z',
  version: 1,
  weather: {condition: 'clear', temperatureCelsius: 24},
}
const now = new Date('2026-10-06T03:00:00.000Z')

const setup = () => {
  const repository = {
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([entry]),
    save: vi.fn().mockResolvedValue(undefined),
  } satisfies PictureDiaryRepository
  const onSaved = vi.fn()
  return createRoot((dispose) => {
    const editing = useEntryEditing({
      environment: {
        createId: () => 'unused',
        now: () => now,
        observeCompact: () => () => undefined,
      },
      onSaved,
      repository,
    })
    editing.open(entry)
    return {dispose, editing, onSaved, repository}
  })
}

it('should persist one snapshot and block editor actions during overlapping saves', async () => {
  const {dispose, editing, onSaved, repository} = setup()
  const pending = Promise.withResolvers<void>()
  repository.save.mockReturnValue(pending.promise)
  const draft = editing.editor()!
  draft.onTextChange('Edited diary')
  const first = draft.onSave()
  const second = draft.onSave()

  expect(editing.editor()).toMatchObject({canSave: false, disabled: true, text: 'Edited diary'})
  draft.onTextChange('Blocked edit')
  draft.onCancelEdit()
  editing.open({...entry, id: 'another-entry'})
  expect(editing.editor()).toMatchObject({id: entry.id, text: 'Edited diary'})
  expect(repository.save).toHaveBeenCalledOnce()

  pending.resolve()
  await Promise.all([first, second])
  expect(repository.save).toHaveBeenCalledWith({
    ...entry,
    text: 'Edited diary',
    updatedAt: now.toISOString(),
  })
  expect(onSaved).toHaveBeenCalledOnce()
  expect(onSaved).toHaveBeenCalledWith(repository.save.mock.calls[0][0])
  expect(editing.editor()).toBeUndefined()
  dispose()
})

it('should retain failed drafts, clear feedback on changes, and retry', async () => {
  const {dispose, editing, onSaved, repository} = setup()
  repository.save.mockRejectedValueOnce(new Error('Storage failed'))
  await expect(editing.editor()!.onSave()).resolves.toBeUndefined()
  expect(editing.editor()).toMatchObject({
    canSave: true,
    disabled: false,
    editingMessage: m.picture_diary_save_failed(),
    text: entry.text,
  })
  expect(onSaved).not.toHaveBeenCalled()
  editing.editor()!.onTextChange('Retry diary')
  expect(editing.editor()!.editingMessage).toBeUndefined()
  await editing.editor()!.onSave()
  expect(onSaved).toHaveBeenCalledWith({
    ...entry,
    text: 'Retry diary',
    updatedAt: now.toISOString(),
  })
  expect(editing.editor()).toBeUndefined()
  dispose()
})

it.each(['resolve', 'reject'] as const)(
  'should finish a %s save after disposal without editor effects',
  async (outcome) => {
    const {dispose, editing, onSaved, repository} = setup()
    const pending = Promise.withResolvers<void>()
    repository.save.mockReturnValue(pending.promise)
    const saving = editing.editor()!.onSave()
    dispose()
    if (outcome === 'resolve') {
      pending.resolve()
    } else {
      pending.reject(new Error('Storage failed'))
    }
    await expect(saving).resolves.toBeUndefined()
    expect(repository.save).toHaveBeenCalledOnce()
    expect(onSaved).not.toHaveBeenCalled()
    expect(editing.editor()).toMatchObject({
      disabled: true,
      editingMessage: undefined,
      text: entry.text,
    })
  },
)

it('should leave the draft untouched if the saved callback disposes its owner', async () => {
  const {dispose, editing, onSaved, repository} = setup()
  onSaved.mockImplementation(dispose)
  await expect(editing.editor()!.onSave()).resolves.toBeUndefined()
  expect(repository.save).toHaveBeenCalledOnce()
  expect(onSaved).toHaveBeenCalledOnce()
  expect(editing.editor()).toMatchObject({text: entry.text})
})

it('should retain a draft after a saved callback fails and allow an unchanged retry', async () => {
  const {dispose, editing, onSaved, repository} = setup()
  onSaved.mockImplementationOnce(() => {
    throw new Error('Failed to update the diary list')
  })
  await expect(editing.editor()!.onSave()).resolves.toBeUndefined()
  expect(editing.editor()).toMatchObject({
    disabled: false,
    editingMessage: m.picture_diary_save_failed(),
    text: entry.text,
  })
  const pending = Promise.withResolvers<void>()
  repository.save.mockReturnValueOnce(pending.promise)
  const retry = editing.editor()!.onSave()
  expect(editing.editor()).toMatchObject({disabled: true, editingMessage: undefined})
  pending.resolve()
  await retry
  expect(repository.save).toHaveBeenCalledTimes(2)
  expect(onSaved).toHaveBeenCalledTimes(2)
  expect(editing.editor()).toBeUndefined()
  dispose()
})

it('should expose synchronous entry validation failures without writing storage', async () => {
  const {dispose, editing, repository} = setup()
  editing.editor()!.onDateChange('invalid-date')
  await expect(editing.editor()!.onSave()).resolves.toBeUndefined()
  expect(repository.save).not.toHaveBeenCalled()
  expect(editing.editor()).toMatchObject({
    disabled: false,
    editingMessage: m.picture_diary_save_failed(),
  })
  editing.editor()!.onCancelEdit()
  editing.open(entry)
  expect(editing.editor()!.editingMessage).toBeUndefined()
  dispose()
})
