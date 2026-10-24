import {createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {cx} from 'class-variance-authority'
import {PSelect} from '../p-select/PSelect'
import {FIELD_LABEL} from '../field-classes'

const MINUTE_OFFSET = 3
const MINUTE_COUNT = 60
const HOUR_COUNT = 24
const BUTTON_CLASSES = cx(
  'min-h-control-md rounded-control border border-solid border-border bg-surface text-foreground',
  'focus-visible:shadow-focus',
)

export interface PTimePickerProps {
  readonly label?: string
  readonly value?: string
  readonly disabled?: boolean
  readonly clearable?: boolean
  readonly onChange?: (value: string) => void
}
const timeOptions = (count: number) =>
  Array.from({length: count}, (_, index) => {
    const value = String(index).padStart(2, '0')
    return {label: value, value}
  })
const HOURS = timeOptions(HOUR_COUNT)
const MINUTES = timeOptions(MINUTE_COUNT)
/** Selects a 24-hour HH:mm value; value overrides internal selection when supplied. */
export const PTimePicker = (props: PTimePickerProps) => {
  const [local, setLocal] = createSignal('00:00')
  const value = () => {
    const current = props.value ?? local()
    if (props.clearable && current === '') {
      return ''
    }
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(current) ? current : local() || '00:00'
  }
  const label = () => props.label ?? m.picker_time()
  const change = (hour: string, minute: string) => {
    const next = `${hour}:${minute}`
    setLocal(next)
    props.onChange?.(next)
  }
  const clear = () => {
    setLocal('')
    props.onChange?.('')
  }
  return (
    <fieldset disabled={props.disabled} class="m-0 min-w-0 border-0 p-0">
      <legend class={`${FIELD_LABEL} mb-1.5`}>{label()}</legend>
      <Show
        when={value() !== ''}
        fallback={
          <button
            type="button"
            aria-label={`${label()} ${m.picker_choose_time()}`}
            onClick={() => change('00', '00')}
            class={cx(BUTTON_CLASSES, 'w-full px-4 py-2 text-left')}
          >
            {m.picker_choose_time()}
          </button>
        }
      >
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <div class="grid min-w-[12rem] flex-1 basis-[12rem] grid-cols-2 gap-2">
            <PSelect
              disabled={props.disabled}
              label={m.picker_hour()}
              accessibleLabel={`${label()} ${m.picker_hour()}`}
              hideLabel
              options={HOURS}
              value={value().slice(0, 2)}
              onChange={(hour) => change(hour, value().slice(MINUTE_OFFSET))}
            />
            <PSelect
              disabled={props.disabled}
              label={m.picker_minute()}
              accessibleLabel={`${label()} ${m.picker_minute()}`}
              hideLabel
              options={MINUTES}
              value={value().slice(MINUTE_OFFSET)}
              onChange={(minute) => change(value().slice(0, 2), minute)}
            />
          </div>
          <Show when={props.clearable}>
            <button
              type="button"
              aria-label={`${label()} ${m.picker_clear()}`}
              onClick={clear}
              class={cx(
                BUTTON_CLASSES,
                'flex flex-none items-center justify-center whitespace-nowrap px-3',
                'max-[374px]:w-11 max-[374px]:px-0',
              )}
            >
              <span aria-hidden="true" class="i-tabler-eraser size-5 min-[375px]:hidden" />
              <span class="hidden min-[375px]:inline">{m.picker_clear()}</span>
            </button>
          </Show>
        </div>
      </Show>
    </fieldset>
  )
}
