import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

import * as m from '@paraglide/message'
import type {MemoryRecallMode} from '../../features/memory-assist'
import {PSelect, type PSelectOption} from '../PSelect'
import {PSwitch} from '../PSwitch'

export type ReminderDay = 'custom' | 'today' | 'tomorrow'

export interface ReminderDraft {
  readonly customDate: string
  readonly exactEnabled: boolean
  readonly exactReminderAdvanceMinutes: number
  readonly exactReminderRepeatEnabled: boolean
  readonly exactReminderRepeatIntervalMinutes: number
  readonly exactReminderRepeatUntilMinutes: number
  readonly recallMode: MemoryRecallMode
  readonly reminderDay: ReminderDay
  readonly reminderTime: string
}

export interface ReminderFieldsProps {
  readonly draft: () => ReminderDraft
  readonly minimumDate?: string
  readonly onChange: (draft: ReminderDraft) => void
}

const INPUT_CLASSES = cx(
  'box-border min-h-control-md w-full rounded-control border border-solid border-border',
  'bg-black/20 px-4 text-base text-foreground outline-none',
  'focus-visible:border-highlight focus-visible:shadow-focus',
)

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

const getWholeMinutes = (value: number, minimum: number) =>
  Number.isFinite(value) ? Math.max(minimum, Math.trunc(value)) : minimum

export const ReminderFields = (props: ReminderFieldsProps) => {
  const updateDraft = (changes: Partial<ReminderDraft>) => {
    const currentDraft = props.draft()
    props.onChange({...currentDraft, ...changes})
  }

  const handleExactEnabledChange = (exactEnabled: boolean) => {
    const currentDraft = props.draft()

    props.onChange({
      ...currentDraft,
      exactEnabled,
      recallMode: exactEnabled ? 'none' : currentDraft.recallMode,
    })
  }

  return (
    <>
      <PSwitch
        checked={props.draft().exactEnabled}
        description={m.memory_memo_exact_description()}
        label={m.memory_memo_exact_enabled()}
        onChange={handleExactEnabledChange}
      />

      <Show when={props.draft().exactEnabled}>
        <div class="grid grid-cols-2 gap-3 max-xs:grid-cols-1">
          <PSelect
            label={m.memory_memo_day()}
            onChange={(reminderDay) => updateDraft({reminderDay})}
            options={getDayOptions()}
            value={props.draft().reminderDay}
          />
          <label class="grid gap-1.5 text-sm font-650 text-foreground">
            <span>{m.memory_memo_time()}</span>
            <input
              class={INPUT_CLASSES}
              onInput={(event) => updateDraft({reminderTime: event.currentTarget.value})}
              type="time"
              value={props.draft().reminderTime}
            />
          </label>
        </div>
        <Show when={props.draft().reminderDay === 'custom'}>
          <label class="grid gap-1.5 text-sm font-650 text-foreground">
            <span>{m.memory_memo_date()}</span>
            <input
              class={INPUT_CLASSES}
              min={props.minimumDate}
              onInput={(event) => updateDraft({customDate: event.currentTarget.value})}
              type="date"
              value={props.draft().customDate}
            />
          </label>
        </Show>

        <label class="grid gap-1.5 text-sm font-650 text-foreground">
          <span>{m.memory_memo_exact_advance()}</span>
          <input
            class={INPUT_CLASSES}
            min="0"
            onInput={(event) =>
              updateDraft({
                exactReminderAdvanceMinutes: getWholeMinutes(event.currentTarget.valueAsNumber, 0),
              })
            }
            type="number"
            value={props.draft().exactReminderAdvanceMinutes}
          />
        </label>

        <PSwitch
          checked={props.draft().exactReminderRepeatEnabled}
          description={m.memory_memo_exact_repeat_description()}
          label={m.memory_memo_exact_repeat_enabled()}
          onChange={(exactReminderRepeatEnabled) => updateDraft({exactReminderRepeatEnabled})}
        />

        <Show when={props.draft().exactReminderRepeatEnabled}>
          <div class="grid grid-cols-2 gap-3 max-xs:grid-cols-1">
            <label class="grid gap-1.5 text-sm font-650 text-foreground">
              <span>{m.memory_memo_exact_repeat_interval()}</span>
              <input
                class={INPUT_CLASSES}
                min="1"
                onInput={(event) =>
                  updateDraft({
                    exactReminderRepeatIntervalMinutes: getWholeMinutes(
                      event.currentTarget.valueAsNumber,
                      1,
                    ),
                  })
                }
                type="number"
                value={props.draft().exactReminderRepeatIntervalMinutes}
              />
            </label>
            <label class="grid gap-1.5 text-sm font-650 text-foreground">
              <span>{m.memory_memo_exact_repeat_until()}</span>
              <input
                class={INPUT_CLASSES}
                min="0"
                onInput={(event) =>
                  updateDraft({
                    exactReminderRepeatUntilMinutes: getWholeMinutes(
                      event.currentTarget.valueAsNumber,
                      0,
                    ),
                  })
                }
                type="number"
                value={props.draft().exactReminderRepeatUntilMinutes}
              />
            </label>
          </div>
        </Show>
      </Show>

      <Show when={!props.draft().exactEnabled}>
        <div class="border-t border-solid border-border pt-4">
          <PSelect
            description={m.memory_memo_recall_hint()}
            label={m.memory_memo_recall()}
            onChange={(recallMode) => updateDraft({recallMode})}
            options={getRecallOptions()}
            value={props.draft().recallMode}
          />
        </div>
      </Show>
    </>
  )
}
