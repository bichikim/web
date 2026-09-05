import {createSignal, For, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {usePEvents} from '../../features/focus-room-dialogue'
import {
  deleteMemoryMemo,
  editMemoryMemo,
  type MemoryMemo,
  updateMemoryMemos,
  useMemoryMemos,
} from '../../features/memory-assist'
import {PSettingsEmptyState} from '../settings/EmptyState'
import {PSettingsSectionHeading} from '../settings/SectionHeading'
import {MemoryMemoCreator} from './MemoryMemoCreator'
import {type MemoryMemoEdit, MemoryMemoItem} from './MemoryMemoItem'
import {isFirstReminderInFuture} from './reminder-draft'

export const MemoryMemoList = () => {
  const events = usePEvents()
  const memos = useMemoryMemos()
  const [message, setMessage] = createSignal<string | null>(null)

  const handleDelete = async (memo: MemoryMemo) => {
    try {
      await deleteMemoryMemo({deleteDialogue: events.deleteDialogue, memoId: memo.id})
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to delete a memory memo.', error)
      setMessage(m.memory_memo_delete_failed())
    }
  }

  const handleEdit = async (memo: MemoryMemo, edit: MemoryMemoEdit) => {
    const now = new Date()

    if (
      edit.exactEnabled &&
      !isFirstReminderInFuture(edit.exactReminderAt, edit.exactReminderAdvanceMinutes, now)
    ) {
      return m.memory_memo_invalid_time()
    }

    let removedDialogueId: string | null = null

    try {
      await updateMemoryMemos((currentMemos) =>
        currentMemos.map((currentMemo) => {
          if (currentMemo.id !== memo.id || currentMemo.deletionPending === true) {
            return currentMemo
          }

          const editedMemo = editMemoryMemo({
            exactReminderAdvanceMinutes: edit.exactReminderAdvanceMinutes,
            exactReminderAt: edit.exactReminderAt,
            exactReminderRepeatIntervalMinutes: edit.exactReminderRepeatIntervalMinutes,
            exactReminderRepeatUntilMinutes: edit.exactReminderRepeatUntilMinutes,
            memo: currentMemo,
            now,
            random: Math.random,
            recallMode: edit.recallMode,
            text: edit.text,
          })
          removedDialogueId = editedMemo.dialogueId === null ? currentMemo.dialogueId : null
          return editedMemo
        }),
      )
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to edit a memory memo.', error)
      return m.memory_memo_edit_failed()
    }

    if (removedDialogueId !== null) {
      events.deleteDialogue(removedDialogueId).catch((error: unknown) => {
        console.error('Failed to delete the previous memory memo dialogue.', error)
      })
    }

    return null
  }

  return (
    <section class="grid gap-4.5 settings-compact:gap-4">
      <MemoryMemoCreator />

      <PSettingsSectionHeading
        count={m.memory_memo_count({count: memos().length})}
        title={m.memory_memo_saved()}
      />
      <Show
        fallback={<PSettingsEmptyState>{m.memory_memo_empty()}</PSettingsEmptyState>}
        when={memos().length > 0}
      >
        <ul class="m-0 grid max-h-[21rem] list-none gap-2 overflow-y-auto p-0 pr-1">
          <For each={memos()}>
            {(memo) => (
              <MemoryMemoItem
                memo={memo}
                onDelete={handleDelete}
                onEditStart={() => setMessage(null)}
                onSave={handleEdit}
              />
            )}
          </For>
        </ul>
      </Show>

      <Show when={message()}>
        {(currentMessage) => (
          <p aria-live="polite" class="m-0 text-sm text-danger" role="status">
            {currentMessage()}
          </p>
        )}
      </Show>
    </section>
  )
}
