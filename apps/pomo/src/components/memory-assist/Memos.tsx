import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, onMount, Show, untrack} from 'solid-js'

import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {usePEvents} from '../../features/focus-room-dialogue'
import {
  createMemoryMemo,
  deleteMemoryMemoDraft,
  editMemoryMemo,
  MAXIMUM_MEMORY_MEMO_LENGTH,
  MEMORY_REINFORCEMENT_INTERVALS,
  type MemoryMemo,
  type MemoryRecallMode,
  readMemoryMemoDraft,
  updateMemoryMemos,
  useMemoryMemos,
  writeMemoryMemoDraft,
} from '../../features/memory-assist'
import {PButton} from '../PButton'
import {PModal} from '../PModal'
import {PSettingsEmptyState} from '../settings/EmptyState'
import {PSettingsSectionHeading} from '../settings/SectionHeading'
import {type ReminderDay, type ReminderDraft, ReminderFields} from './ReminderFields'

const [DEFAULT_REMINDER_DELAY] = MEMORY_REINFORCEMENT_INTERVALS
const DEFAULT_EXACT_REPEAT_INTERVAL_MINUTES = 10
const DEFAULT_EXACT_REPEAT_UNTIL_MINUTES = 60
const MILLISECONDS_PER_MINUTE = 60_000

const TEXTAREA_CLASSES = cx(
  'box-border min-h-24 w-full resize-y rounded-5 border border-solid border-border',
  'bg-surface-strong p-4 text-base font-500 leading-7 text-foreground outline-none',
  'transition-[border-color_160ms_ease,box-shadow_160ms_ease]',
  'placeholder:text-muted-foreground focus-visible:border-highlight focus-visible:shadow-focus',
  'motion-reduce:transition-none',
)

const padNumber = (value: number) => String(value).padStart(2, '0')
const getDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
const getTimeInputValue = (date: Date) =>
  `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`

const getDefaultReminderDate = (now: Date) => {
  const date = new Date(now.getTime() + DEFAULT_REMINDER_DELAY)
  date.setSeconds(0, 0)
  return date
}

const resolveReminderAt = (day: ReminderDay, customDate: string, time: string, now: Date) => {
  const date = new Date(now)

  if (day === 'tomorrow') {
    date.setDate(date.getDate() + 1)
  }

  const dateValue = day === 'custom' ? customDate : getDateInputValue(date)
  const reminder = new Date(`${dateValue}T${time}`)
  return Number.isNaN(reminder.getTime()) ? null : reminder.toISOString()
}

const formatReminderTime = (value: string) =>
  new Intl.DateTimeFormat(getLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

interface CreateReminderDraftOptions {
  readonly exactReminderAdvanceMinutes?: number
  readonly exactReminderAt: string | null
  readonly exactReminderRepeatIntervalMinutes?: number | null
  readonly exactReminderRepeatUntilMinutes?: number
  readonly now: Date
  readonly recallMode: MemoryRecallMode
}

const createReminderDraft = (options: CreateReminderDraftOptions): ReminderDraft => {
  const reminder =
    options.exactReminderAt === null
      ? getDefaultReminderDate(options.now)
      : new Date(options.exactReminderAt)
  const reminderDate = getDateInputValue(reminder)
  const today = getDateInputValue(options.now)
  const tomorrow = new Date(options.now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = getDateInputValue(tomorrow)
  const reminderDay =
    reminderDate === today ? 'today' : reminderDate === tomorrowDate ? 'tomorrow' : 'custom'

  return {
    customDate: reminderDate,
    exactEnabled: options.exactReminderAt !== null,
    exactReminderAdvanceMinutes: options.exactReminderAdvanceMinutes ?? 0,
    exactReminderRepeatEnabled:
      options.exactReminderRepeatIntervalMinutes !== undefined &&
      options.exactReminderRepeatIntervalMinutes !== null,
    exactReminderRepeatIntervalMinutes:
      options.exactReminderRepeatIntervalMinutes ?? DEFAULT_EXACT_REPEAT_INTERVAL_MINUTES,
    exactReminderRepeatUntilMinutes:
      options.exactReminderRepeatUntilMinutes ?? DEFAULT_EXACT_REPEAT_UNTIL_MINUTES,
    recallMode: options.recallMode,
    reminderDay,
    reminderTime: getTimeInputValue(reminder),
  }
}

const areReminderDraftsEqual = (left: ReminderDraft, right: ReminderDraft) =>
  left.exactEnabled === right.exactEnabled &&
  left.recallMode === right.recallMode &&
  (!left.exactEnabled ||
    (left.exactReminderAdvanceMinutes === right.exactReminderAdvanceMinutes &&
      left.exactReminderRepeatEnabled === right.exactReminderRepeatEnabled &&
      (!left.exactReminderRepeatEnabled ||
        (left.exactReminderRepeatIntervalMinutes === right.exactReminderRepeatIntervalMinutes &&
          left.exactReminderRepeatUntilMinutes === right.exactReminderRepeatUntilMinutes)) &&
      left.customDate === right.customDate &&
      left.reminderDay === right.reminderDay &&
      left.reminderTime === right.reminderTime))

const persistCreationDraft = (text: string, reminderDraft: ReminderDraft) => {
  writeMemoryMemoDraft({...reminderDraft, text, version: 1})
}

const createStoredReminderDraft = (memo: MemoryMemo) =>
  createReminderDraft({
    exactReminderAdvanceMinutes: memo.exactReminderAdvanceMinutes,
    exactReminderAt: memo.exactReminderAt,
    exactReminderRepeatIntervalMinutes: memo.exactReminderRepeatIntervalMinutes,
    exactReminderRepeatUntilMinutes: memo.exactReminderRepeatUntilMinutes,
    now: new Date(),
    recallMode: memo.recallMode,
  })

interface MemoryMemoModalProps {
  readonly canSave: boolean
  readonly isOpen: boolean
  readonly message: () => string | null
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onReminderChange: (draft: ReminderDraft) => void
  readonly onSave: () => Promise<void>
  readonly onTextInput: (text: string) => void
  readonly reminderDraft: () => ReminderDraft
  readonly saveLabel: string
  readonly text: () => string
  readonly title: string
  readonly triggerElement: () => HTMLElement | null
}

const MemoryMemoModal = (props: MemoryMemoModalProps) => {
  const [isPending, setIsPending] = createSignal(false)
  const [textAreaElement, setTextAreaElement] = createSignal<HTMLTextAreaElement | null>(null)

  const handleSave = async () => {
    if (isPending()) {
      return
    }

    setIsPending(true)

    try {
      await props.onSave()
    } finally {
      setIsPending(false)
    }
  }

  return (
    <PModal
      getInitialFocus={textAreaElement}
      isOpen={props.isOpen}
      onCloseAutoFocus={() => props.triggerElement()?.focus()}
      onOpenChange={props.onOpenChange}
      placement="top"
      title={props.title}
    >
      <div class="grid gap-4">
        <label class="grid gap-2 text-sm font-650 text-foreground">
          <span>{m.memory_memo_input()}</span>
          <textarea
            class={TEXTAREA_CLASSES}
            maxlength={MAXIMUM_MEMORY_MEMO_LENGTH}
            onInput={(event) => props.onTextInput(event.currentTarget.value)}
            placeholder={m.memory_memo_placeholder()}
            ref={setTextAreaElement}
            value={props.text()}
          />
        </label>

        <ReminderFields
          draft={props.reminderDraft}
          minimumDate={getDateInputValue(new Date())}
          onChange={props.onReminderChange}
        />

        <Show when={props.message()}>
          {(currentMessage) => (
            <p aria-live="polite" class="m-0 text-sm text-danger" role="status">
              {currentMessage()}
            </p>
          )}
        </Show>

        <PButton class="w-full" disabled={!props.canSave || isPending()} onPress={handleSave}>
          {props.saveLabel}
        </PButton>
      </div>
    </PModal>
  )
}

const MemoryMemoCreator = () => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [message, setMessage] = createSignal<string | null>(null)
  const [text, setText] = createSignal('')
  const [reminderDraft, setReminderDraft] = createSignal(
    createReminderDraft({exactReminderAt: null, now: new Date(), recallMode: 'none'}),
  )
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const canSave = createMemo(() => text().trim().length > 0)

  const handleTextInput = (nextText: string) => {
    setText(nextText)
    persistCreationDraft(nextText, reminderDraft())
  }

  const handleReminderChange = (nextReminderDraft: ReminderDraft) => {
    setReminderDraft(nextReminderDraft)
    persistCreationDraft(text(), nextReminderDraft)
  }

  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    setMessage(null)
    setIsOpen(true)
  }

  onMount(() => {
    const storedDraft = readMemoryMemoDraft()
    if (storedDraft === null) {
      return
    }

    setText(storedDraft.text)
    setReminderDraft({
      customDate: storedDraft.customDate,
      exactEnabled: storedDraft.exactEnabled,
      exactReminderAdvanceMinutes: storedDraft.exactReminderAdvanceMinutes,
      exactReminderRepeatEnabled: storedDraft.exactReminderRepeatEnabled,
      exactReminderRepeatIntervalMinutes: storedDraft.exactReminderRepeatIntervalMinutes,
      exactReminderRepeatUntilMinutes: storedDraft.exactReminderRepeatUntilMinutes,
      recallMode: storedDraft.recallMode,
      reminderDay: storedDraft.reminderDay,
      reminderTime: storedDraft.reminderTime,
    })
  })

  const handleSave = async () => {
    const now = new Date()
    const currentDraft = reminderDraft()
    const exactReminderAt = currentDraft.exactEnabled
      ? resolveReminderAt(
          currentDraft.reminderDay,
          currentDraft.customDate,
          currentDraft.reminderTime,
          now,
        )
      : null
    const firstReminderAt =
      exactReminderAt === null
        ? null
        : Date.parse(exactReminderAt) -
          currentDraft.exactReminderAdvanceMinutes * MILLISECONDS_PER_MINUTE

    if (
      currentDraft.exactEnabled &&
      (firstReminderAt === null || firstReminderAt <= now.getTime())
    ) {
      setMessage(m.memory_memo_invalid_time())
      return
    }

    const memo = createMemoryMemo({
      exactReminderAdvanceMinutes: currentDraft.exactReminderAdvanceMinutes,
      exactReminderAt,
      exactReminderRepeatIntervalMinutes: currentDraft.exactReminderRepeatEnabled
        ? currentDraft.exactReminderRepeatIntervalMinutes
        : null,
      exactReminderRepeatUntilMinutes: currentDraft.exactReminderRepeatUntilMinutes,
      id: crypto.randomUUID(),
      now,
      random: Math.random,
      recallMode: currentDraft.recallMode,
      text: text(),
    })

    try {
      await updateMemoryMemos((currentMemos) => [memo, ...currentMemos])
      deleteMemoryMemoDraft()
      setText('')
      setReminderDraft(
        createReminderDraft({exactReminderAt: null, now: new Date(), recallMode: 'none'}),
      )
      setMessage(null)
      setIsOpen(false)
    } catch (error: unknown) {
      console.error('Failed to save a memory memo.', error)
      setMessage(m.memory_memo_save_failed())
    }
  }

  return (
    <>
      <PButton class="w-full" icon="i-tabler-plus" onPress={handleOpen} tone="secondary">
        {m.memory_memo_new()}
      </PButton>

      <MemoryMemoModal
        canSave={canSave()}
        isOpen={isOpen()}
        message={message}
        onOpenChange={setIsOpen}
        onReminderChange={handleReminderChange}
        onSave={handleSave}
        onTextInput={handleTextInput}
        reminderDraft={reminderDraft}
        saveLabel={m.memory_memo_save()}
        text={text}
        title={m.memory_memo_create_title()}
        triggerElement={triggerElement}
      />
    </>
  )
}

interface MemoryMemoItemProps {
  readonly memo: MemoryMemo
  readonly onDelete: (memo: MemoryMemo) => void
  readonly onEditStart: () => void
  readonly onSave: (memo: MemoryMemo, edit: MemoryMemoEdit) => Promise<string | null>
}

interface MemoryMemoEdit {
  readonly exactEnabled: boolean
  readonly exactReminderAdvanceMinutes: number
  readonly exactReminderAt: string | null
  readonly exactReminderRepeatIntervalMinutes: number | null
  readonly exactReminderRepeatUntilMinutes: number
  readonly recallMode: MemoryRecallMode
  readonly text: string
}

const ITEM_ACTION_CLASSES = cx(
  'inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-control',
  'border border-solid border-border bg-transparent text-muted-foreground outline-none',
  'hover:border-border-hover hover:text-foreground focus-visible:shadow-focus',
)

const MemoryMemoItem = (props: MemoryMemoItemProps) => {
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

export const MemoryMemoList = () => {
  const events = usePEvents()
  const memos = useMemoryMemos()
  const [message, setMessage] = createSignal<string | null>(null)

  const handleDelete = async (memo: MemoryMemo) => {
    try {
      if (memo.dialogueId !== null) {
        await events.deleteDialogue(memo.dialogueId)
      }

      await updateMemoryMemos((currentMemos) =>
        currentMemos.filter((currentMemo) => currentMemo.id !== memo.id),
      )
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to delete a memory memo.', error)
      setMessage(m.memory_memo_delete_failed())
    }
  }

  const handleEdit = async (memo: MemoryMemo, edit: MemoryMemoEdit) => {
    const now = new Date()
    const firstReminderAt =
      edit.exactReminderAt === null
        ? null
        : Date.parse(edit.exactReminderAt) -
          edit.exactReminderAdvanceMinutes * MILLISECONDS_PER_MINUTE

    if (edit.exactEnabled && (firstReminderAt === null || firstReminderAt <= now.getTime())) {
      return m.memory_memo_invalid_time()
    }

    let removedDialogueId: string | null = null

    try {
      await updateMemoryMemos((currentMemos) =>
        currentMemos.map((currentMemo) => {
          if (currentMemo.id !== memo.id) {
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
