import {cx} from 'class-variance-authority'
import {createMemo, createSignal, Show, untrack} from 'solid-js'

import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import type {MemoryMemo, MemoryRecallMode} from '../../features/memory-assist'
import {MemoryMemoModal} from './MemoryMemoModal'
import {
  areReminderDraftsEqual,
  createStoredReminderDraft,
  resolveReminderAt,
} from './reminder-draft'

export interface MemoryMemoEdit {
  readonly exactEnabled: boolean
  readonly exactReminderAdvanceMinutes: number
  readonly exactReminderAt: string | null
  readonly exactReminderRepeatIntervalMinutes: number | null
  readonly exactReminderRepeatUntilMinutes: number
  readonly recallMode: MemoryRecallMode
  readonly text: string
}

export interface MemoryMemoItemProps {
  readonly memo: MemoryMemo
  readonly onDelete: (memo: MemoryMemo) => void
  readonly onEditStart: () => void
  readonly onSave: (memo: MemoryMemo, edit: MemoryMemoEdit) => Promise<string | null>
}

const ITEM_ACTION_CLASSES = cx(
  'inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-control',
  'border border-solid border-border bg-transparent text-muted-foreground outline-none',
  'hover:border-border-hover hover:text-foreground focus-visible:shadow-focus',
)

const formatReminderTime = (value: string) =>
  new Intl.DateTimeFormat(getLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export const MemoryMemoItem = (props: MemoryMemoItemProps) => {
  const initialReminderDraft = untrack(() => createStoredReminderDraft(props.memo))
  const [isEditing, setIsEditing] = createSignal(false)
  const [message, setMessage] = createSignal<string | null>(null)
  const [draft, setDraft] = createSignal(untrack(() => props.memo.text))
  const [reminderDraft, setReminderDraft] = createSignal(initialReminderDraft)
  const [originalReminderDraft, setOriginalReminderDraft] = createSignal(initialReminderDraft)
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const canSave = createMemo(() => {
    const nextText = draft().trim()
    return (
      nextText.length > 0 &&
      (nextText !== props.memo.text ||
        !areReminderDraftsEqual(reminderDraft(), originalReminderDraft()))
    )
  })

  const handleStartEdit = (source: HTMLButtonElement) => {
    const nextReminderDraft = createStoredReminderDraft(props.memo)
    props.onEditStart()
    setMessage(null)
    setTriggerElement(source)
    setDraft(props.memo.text)
    setOriginalReminderDraft(nextReminderDraft)
    setReminderDraft(nextReminderDraft)
    setIsEditing(true)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setDraft(props.memo.text)
      setReminderDraft(originalReminderDraft())
    }

    setIsEditing(isOpen)
  }

  const handleSave = async () => {
    if (!canSave()) {
      return
    }

    const now = new Date()
    const currentReminderDraft = reminderDraft()
    const exactReminderAt = currentReminderDraft.exactEnabled
      ? resolveReminderAt(
          currentReminderDraft.reminderDay,
          currentReminderDraft.customDate,
          currentReminderDraft.reminderTime,
          now,
        )
      : null
    const errorMessage = await props.onSave(props.memo, {
      exactEnabled: currentReminderDraft.exactEnabled,
      exactReminderAdvanceMinutes: currentReminderDraft.exactReminderAdvanceMinutes,
      exactReminderAt,
      exactReminderRepeatIntervalMinutes: currentReminderDraft.exactReminderRepeatEnabled
        ? currentReminderDraft.exactReminderRepeatIntervalMinutes
        : null,
      exactReminderRepeatUntilMinutes: currentReminderDraft.exactReminderRepeatUntilMinutes,
      recallMode: currentReminderDraft.recallMode,
      text: draft(),
    })

    if (errorMessage !== null) {
      setMessage(errorMessage)
      return
    }

    setIsEditing(false)
  }

  return (
    <li class="grid gap-2 rounded-panel border border-solid border-border bg-content-surface p-4">
      <div class="flex items-start justify-between gap-3">
        <p class="m-0 min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {props.memo.text}
        </p>
        <div class="flex flex-none gap-1.5">
          <button
            aria-label={m.memory_memo_edit({memo: props.memo.text})}
            class={ITEM_ACTION_CLASSES}
            onClick={(event) => handleStartEdit(event.currentTarget)}
            type="button"
          >
            <span aria-hidden="true" class="i-tabler-pencil size-4" />
          </button>
          <button
            aria-label={m.memory_memo_remove({memo: props.memo.text})}
            class={ITEM_ACTION_CLASSES}
            onClick={() => props.onDelete(props.memo)}
            type="button"
          >
            <span aria-hidden="true" class="i-tabler-trash size-4" />
          </button>
        </div>
      </div>

      <MemoryMemoModal
        canSave={canSave()}
        isOpen={isEditing()}
        message={message}
        onOpenChange={handleOpenChange}
        onReminderChange={setReminderDraft}
        onSave={handleSave}
        onTextInput={setDraft}
        reminderDraft={reminderDraft}
        saveLabel={m.memory_memo_edit_save()}
        text={draft}
        title={m.memory_memo_edit({memo: props.memo.text})}
        triggerElement={triggerElement}
      />

      <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
        <Show when={props.memo.nextExactReminderAt}>
          {(time) => <span>{m.memory_memo_next_exact({time: formatReminderTime(time())})}</span>}
        </Show>
        <Show when={props.memo.nextRecallAt}>
          {(time) => <span>{m.memory_memo_next_recall({time: formatReminderTime(time())})}</span>}
        </Show>
        <Show when={props.memo.reminderHistory.length > 0}>
          <span>{m.memory_memo_history({count: props.memo.reminderHistory.length})}</span>
        </Show>
      </div>
    </li>
  )
}
