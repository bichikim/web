import {createSignal, onCleanup} from 'solid-js'
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

const restorePictureDiaryEntry = async (
  repository: PictureDiaryRepository,
  entry: PictureDiaryEntry,
): Promise<void> => {
  try {
    await repository.save(entry)
  } catch (error: unknown) {
    console.error('Failed to restore a picture diary entry after disposal.', error)
  }
}

export const useEntryEditing = (options: EntryEditingOptions) => {
  const [entry, setEntry] = createSignal<PictureDiaryEntry>()
  const [saving, setSaving] = createSignal(false)
  const [message, setMessage] = createSignal<string>()
  let isDisposed = false

  onCleanup(() => {
    isDisposed = true
  })

  const update = (change: Partial<PictureDiaryEntry>) => {
    if (!saving()) {
      setEntry((current) => current && {...current, ...change})
      setMessage(undefined)
    }
  }
  const close = () => {
    if (!saving()) {
      setEntry(undefined)
      setMessage(undefined)
    }
  }
  const save = async () => {
    const draft = entry()
    if (draft === undefined || saving()) {
      return
    }
    setSaving(true)
    setMessage(undefined)
    try {
      const updated = createPictureDiaryEntry({...draft, now: options.environment.now()})
      await options.repository.save(updated)
      if (isDisposed) {
        await restorePictureDiaryEntry(options.repository, draft)
        return
      }
      options.onSaved(updated)
      if (!isDisposed) {
        setEntry(undefined)
      }
    } catch {
      if (!isDisposed) {
        setMessage(m.picture_diary_save_failed())
      }
    } finally {
      if (!isDisposed) {
        setSaving(false)
      }
    }
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
      setMessage(undefined)
    }
  }
  return {editor, open}
}

export type EntryEditingController = ReturnType<typeof useEntryEditing>
