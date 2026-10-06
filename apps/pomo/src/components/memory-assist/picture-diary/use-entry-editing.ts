import {createMemo, createSignal, onCleanup} from 'solid-js'
import {useAsyncTask} from 'src/features/async-task'
import * as m from '@paraglide/message'
import {
  createPictureDiaryEntry,
  type PictureDiaryEntry,
  type PictureDiaryImage,
  type PictureDiaryRepository,
  type PictureDiaryStroke,
} from '../../../features/picture-diary'
import type {PictureDiaryEnvironment} from './environment'

interface EntryEditingOptions {
  readonly repository: PictureDiaryRepository
  readonly environment: PictureDiaryEnvironment
  readonly onSaved: (entry: PictureDiaryEntry) => void
}

export const useEntryEditing = (options: EntryEditingOptions) => {
  const [entry, setEntry] = createSignal<PictureDiaryEntry>()
  let isDisposed = false

  onCleanup(() => {
    isDisposed = true
  })

  const persistence = useAsyncTask({
    concurrency: 'exhaust',
    task: async (draft: PictureDiaryEntry) => {
      const updated = createPictureDiaryEntry({...draft, now: options.environment.now()})
      await options.repository.save(updated)
      if (isDisposed) {
        return
      }
      options.onSaved(updated)
      if (!isDisposed) {
        setEntry(undefined)
      }
    },
  })
  const saving = createMemo(() => persistence.state().status === 'pending')
  const message = () =>
    persistence.state().status === 'error' ? m.picture_diary_save_failed() : undefined

  const update = (change: Partial<PictureDiaryEntry>) => {
    if (!saving()) {
      setEntry((current) => current && {...current, ...change})
      persistence.reset()
    }
  }
  const close = () => {
    if (!saving()) {
      setEntry(undefined)
      persistence.reset()
    }
  }
  const save = async () => {
    const draft = entry()
    if (draft === undefined || saving()) {
      return
    }
    // The editor exposes persistence failures through the task state.
    await persistence.execute(draft).catch(() => undefined)
  }
  const editor = () => {
    const draft = entry()
    return (
      draft && {
        ...draft,
        canSave:
          !saving() &&
          Boolean(draft.date && (draft.text.trim() || draft.strokes.length || draft.image)),
        disabled: saving(),
        editingMessage: message(),
        onCancelEdit: close,
        onDateChange: (date: string) => update({date}),
        onImageChange: (image: PictureDiaryImage | undefined) => update({image}),
        onSave: save,
        onStrokesChange: (strokes: ReadonlyArray<PictureDiaryStroke>) => update({strokes}),
        onTextChange: (text: string) => update({text}),
      }
    )
  }
  const open = (value: PictureDiaryEntry) => {
    if (!saving()) {
      setEntry(value)
      persistence.reset()
    }
  }
  return {editor, open}
}

export type EntryEditingController = ReturnType<typeof useEntryEditing>
