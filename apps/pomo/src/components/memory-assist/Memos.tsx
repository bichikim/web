import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {usePEvents} from '../../features/focus-room-dialogue'
import {
  createMemoryMemo,
  MAXIMUM_MEMORY_MEMO_LENGTH,
  MEMORY_REINFORCEMENT_INTERVALS,
  type MemoryMemo,
  type MemoryRecallMode,
  updateMemoryMemos,
  useMemoryMemos,
} from '../../features/memory-assist'
import {PButton} from '../PButton'
import {PSelect, type PSelectOption} from '../PSelect'
import {PSettingsEmptyState} from '../settings/EmptyState'
import {PSettingsSectionHeading} from '../settings/SectionHeading'
import {PSwitch} from '../PSwitch'

type ReminderDay = 'custom' | 'today' | 'tomorrow'
const [DEFAULT_REMINDER_DELAY] = MEMORY_REINFORCEMENT_INTERVALS

const INPUT_CLASSES = cx(
  'box-border min-h-control-md w-full rounded-control border border-solid border-border',
  'bg-black/20 px-4 text-base text-foreground outline-none',
  'focus-visible:border-highlight focus-visible:shadow-focus',
)

const padNumber = (value: number) => String(value).padStart(2, '0')
const getDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
const getTimeInputValue = (date: Date) =>
  `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`

const getDefaultReminderDate = () => {
  const date = new Date(Date.now() + DEFAULT_REMINDER_DELAY)
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

const getDayOptions = (): ReadonlyArray<PSelectOption<ReminderDay>> => [
  {label: m.memory_memo_day_today(), value: 'today'},
  {label: m.memory_memo_day_tomorrow(), value: 'tomorrow'},
  {label: m.memory_memo_day_custom(), value: 'custom'},
]

const getRecallOptions = (): ReadonlyArray<PSelectOption<MemoryRecallMode>> => [
  {label: m.memory_memo_recall_none(), value: 'none'},
  {label: m.memory_memo_recall_random(), value: 'random'},
  {label: m.memory_memo_recall_reinforcement(), value: 'reinforcement'},
]

interface MemoryMemoItemProps {
  readonly memo: MemoryMemo
  readonly onDelete: (memo: MemoryMemo) => void
}

const MemoryMemoItem = (props: MemoryMemoItemProps) => (
  <li class="grid gap-2 rounded-panel border border-solid border-border bg-content-surface p-4">
    <div class="flex items-start justify-between gap-3">
      <p class="m-0 min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
        {props.memo.text}
      </p>
      <button
        aria-label={m.memory_memo_remove({memo: props.memo.text})}
        class={
          'inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-control ' +
          'border border-solid border-border bg-transparent text-muted-foreground ' +
          'hover:border-border-hover hover:text-foreground focus-visible:shadow-focus outline-none'
        }
        onClick={() => props.onDelete(props.memo)}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-trash size-4" />
      </button>
    </div>
    <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
      <Show when={props.memo.exactReminderAt}>
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

export const MemoryMemoList = () => {
  const events = usePEvents()
  const memos = useMemoryMemos()
  const defaultReminder = getDefaultReminderDate()
  const initialReminderDay =
    getDateInputValue(defaultReminder) === getDateInputValue(new Date()) ? 'today' : 'tomorrow'
  const [text, setText] = createSignal('')
  const [exactEnabled, setExactEnabled] = createSignal(false)
  const [reminderDay, setReminderDay] = createSignal<ReminderDay>(initialReminderDay)
  const [customDate, setCustomDate] = createSignal(getDateInputValue(defaultReminder))
  const [reminderTime, setReminderTime] = createSignal(getTimeInputValue(defaultReminder))
  const [recallMode, setRecallMode] = createSignal<MemoryRecallMode>('none')
  const [message, setMessage] = createSignal<string | null>(null)
  const canSave = createMemo(() => text().trim().length > 0)

  const handleSave = async () => {
    const now = new Date()
    const exactReminderAt = exactEnabled()
      ? resolveReminderAt(reminderDay(), customDate(), reminderTime(), now)
      : null

    if (
      exactEnabled() &&
      (exactReminderAt === null || Date.parse(exactReminderAt) <= now.getTime())
    ) {
      setMessage(m.memory_memo_invalid_time())
      return
    }

    const memo = createMemoryMemo({
      exactReminderAt,
      id: crypto.randomUUID(),
      now,
      random: Math.random,
      recallMode: recallMode(),
      text: text(),
    })

    try {
      await updateMemoryMemos((currentMemos) => [memo, ...currentMemos])
      setText('')
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to save a memory memo.', error)
      setMessage(m.memory_memo_save_failed())
    }
  }

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

  return (
    <section class="grid gap-4.5 settings-compact:gap-4">
      <div class="grid gap-4 rounded-panel border border-solid border-border bg-content-surface p-4">
        <label class="grid gap-2 text-sm font-650 text-foreground">
          <span>{m.memory_memo_input()}</span>
          <textarea
            class={`${INPUT_CLASSES} min-h-24 resize-y py-3 leading-6`}
            maxlength={MAXIMUM_MEMORY_MEMO_LENGTH}
            onInput={(event) => setText(event.currentTarget.value)}
            placeholder={m.memory_memo_placeholder()}
            value={text()}
          />
        </label>

        <PSwitch
          checked={exactEnabled()}
          description={m.memory_memo_exact_description()}
          label={m.memory_memo_exact_enabled()}
          onChange={setExactEnabled}
        />

        <Show when={exactEnabled()}>
          <div class="grid grid-cols-2 gap-3 max-xs:grid-cols-1">
            <PSelect
              label={m.memory_memo_day()}
              onChange={setReminderDay}
              options={getDayOptions()}
              value={reminderDay()}
            />
            <label class="grid gap-1.5 text-sm font-650 text-foreground">
              <span>{m.memory_memo_time()}</span>
              <input
                class={INPUT_CLASSES}
                onInput={(event) => setReminderTime(event.currentTarget.value)}
                type="time"
                value={reminderTime()}
              />
            </label>
          </div>
          <Show when={reminderDay() === 'custom'}>
            <label class="grid gap-1.5 text-sm font-650 text-foreground">
              <span>{m.memory_memo_date()}</span>
              <input
                class={INPUT_CLASSES}
                min={getDateInputValue(new Date())}
                onInput={(event) => setCustomDate(event.currentTarget.value)}
                type="date"
                value={customDate()}
              />
            </label>
          </Show>
        </Show>

        <PSelect
          description={m.memory_memo_recall_hint()}
          label={m.memory_memo_recall()}
          onChange={setRecallMode}
          options={getRecallOptions()}
          value={recallMode()}
        />

        <PButton class="w-full" disabled={!canSave()} onPress={handleSave}>
          {m.memory_memo_save()}
        </PButton>
      </div>

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
            {(memo) => <MemoryMemoItem memo={memo} onDelete={handleDelete} />}
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
