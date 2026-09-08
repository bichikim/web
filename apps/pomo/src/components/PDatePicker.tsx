import {createUniqueId, For, Show} from 'solid-js'
import {getLocale} from '@paraglide/runtime'
import * as m from '@paraglide/message'
import {formatDate} from 'src/features/civil-date'
import {PSelect} from './PSelect'
import {usePicker, type UsePickerProps} from './date-picker/use-picker'
import {FIELD_LABEL} from './field-classes'

const MONTH_LENGTH = 7
const REFERENCE_SUNDAY = 4
const REFERENCE_YEAR = 2026
const YEAR_LENGTH = 4

const months = () =>
  Array.from({length: 12}, (_, index) => ({
    label: new Intl.DateTimeFormat(getLocale(), {month: 'short', timeZone: 'UTC'}).format(
      Date.UTC(REFERENCE_YEAR, index, 1),
    ),
    value: String(index + 1),
  }))
const weekdays = () =>
  Array.from({length: 7}, (_, index) =>
    new Intl.DateTimeFormat(getLocale(), {timeZone: 'UTC', weekday: 'narrow'}).format(
      Date.UTC(REFERENCE_YEAR, 0, REFERENCE_SUNDAY + index),
    ),
  )

export interface PDatePickerProps extends UsePickerProps {
  readonly label?: string
  readonly clearable?: boolean
}
/** Selects an ISO date without a native date input; value overrides internal selection when supplied. */
export const PDatePicker = (props: PDatePickerProps) => {
  const picker = usePicker(props)
  const id = createUniqueId()
  const label = () => props.label ?? m.picker_date()
  const years = () =>
    Array.from(
      {
        length:
          Number(picker.maximum().slice(0, YEAR_LENGTH)) -
          Number(picker.minimum().slice(0, YEAR_LENGTH)) +
          1,
      },
      (_, index) => {
        const year = String(Number(picker.minimum().slice(0, YEAR_LENGTH)) + index)
        return {label: year, value: year}
      },
    )

  return (
    <div class="grid min-w-0 gap-1.5">
      <span id={`${id}-label`} class={FIELD_LABEL}>
        {label()}
      </span>
      <button
        ref={picker.setTrigger}
        type="button"
        disabled={props.disabled}
        aria-label={`${label()}: ${picker.value() || m.picker_choose()}`}
        aria-expanded={picker.open()}
        aria-controls={`${id}-calendar`}
        onClick={picker.toggle}
        class={
          'flex min-h-control-md w-full items-center justify-between gap-2 rounded-control border ' +
          'border-solid border-border bg-surface px-4 py-2 text-base text-foreground outline-none ' +
          'hover:border-border-hover focus-visible:shadow-focus disabled:opacity-45'
        }
      >
        <span>{picker.value() || m.picker_choose()}</span>
        <span aria-hidden="true" class="i-tabler-calendar size-5" />
      </button>
      <Show when={picker.open()}>
        <div
          ref={picker.setPanel}
          onKeyDown={picker.onPanelKeyDown}
          id={`${id}-calendar`}
          role="group"
          aria-labelledby={`${id}-label`}
          class="grid min-w-0 gap-3 rounded-panel-inner border border-solid border-border bg-content-surface p-3"
        >
          <div class="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
            <button
              type="button"
              aria-label={m.picker_previous()}
              disabled={
                formatDate(picker.view()).slice(0, MONTH_LENGTH) <=
                picker.minimum().slice(0, MONTH_LENGTH)
              }
              onClick={() => picker.moveMonth(-1)}
              class={
                'size-control-md rounded-control border-0 bg-surface text-foreground outline-none ' +
                'focus-visible:shadow-focus disabled:opacity-45'
              }
            >
              ‹
            </button>
            <PSelect
              label={m.picker_year()}
              options={years()}
              value={String(picker.view().year)}
              onChange={(value) => picker.changeMonth(Number(value), picker.view().month)}
            />
            <PSelect
              label={m.picker_month()}
              options={months()}
              value={String(picker.view().month)}
              onChange={(value) => picker.changeMonth(picker.view().year, Number(value))}
            />
            <button
              type="button"
              aria-label={m.picker_next()}
              disabled={
                formatDate(picker.view()).slice(0, MONTH_LENGTH) >=
                picker.maximum().slice(0, MONTH_LENGTH)
              }
              onClick={() => picker.moveMonth(1)}
              class={
                'size-control-md rounded-control border-0 bg-surface text-foreground outline-none ' +
                'focus-visible:shadow-focus disabled:opacity-45'
              }
            >
              ›
            </button>
          </div>
          <div class="grid grid-cols-7 gap-1 text-center text-sm">
            <For each={weekdays()}>
              {(day) => (
                <span class="py-1 text-muted-foreground" aria-hidden="true">
                  {day}
                </span>
              )}
            </For>
            <For each={picker.cells()}>
              {(date) => (
                <Show when={date} fallback={<span />} keyed>
                  {(day) => (
                    <button
                      type="button"
                      data-date={formatDate(day)}
                      aria-label={formatDate(day)}
                      aria-pressed={picker.value() === formatDate(day)}
                      disabled={!picker.allowed(formatDate(day))}
                      tabIndex={picker.view().day === day.day ? 0 : -1}
                      onClick={() => picker.select(formatDate(day))}
                      onKeyDown={(event) => picker.onKeyDown(event, day)}
                      class={
                        'min-h-10 min-w-0 rounded-control border-0 bg-transparent text-foreground outline-none ' +
                        'hover:bg-surface-interactive focus-visible:shadow-focus aria-pressed:bg-primary-soft ' +
                        'aria-pressed:font-750 disabled:opacity-30'
                      }
                    >
                      {day.day}
                    </button>
                  )}
                </Show>
              )}
            </For>
          </div>
          <p class="m-0 text-xs text-muted-foreground">{m.picker_hint()}</p>
          <Show when={props.clearable}>
            <button
              type="button"
              onClick={() => picker.select('')}
              class={
                'min-h-10 rounded-control border border-solid border-border bg-surface text-foreground ' +
                'focus-visible:shadow-focus'
              }
            >
              {m.picker_clear()}
            </button>
          </Show>
        </div>
      </Show>
    </div>
  )
}
