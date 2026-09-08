import {createSignal} from 'solid-js'
import * as m from '@paraglide/message'
import {PSelect} from './PSelect'
import {FIELD_LABEL} from './field-classes'

const MINUTE_OFFSET = 3
const MINUTE_COUNT = 60
const HOUR_COUNT = 24

export interface PTimePickerProps {
  readonly label?: string
  readonly value?: string
  readonly disabled?: boolean
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
  const value = () =>
    /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(props.value ?? '') ? (props.value ?? local()) : local()
  const label = () => props.label ?? m.picker_time()
  const change = (hour: string, minute: string) => {
    const next = `${hour}:${minute}`
    setLocal(next)
    props.onChange?.(next)
  }
  return (
    <fieldset disabled={props.disabled} class="m-0 min-w-0 border-0 p-0">
      <legend class={`${FIELD_LABEL} mb-1.5`}>{label()}</legend>
      <div class="grid grid-cols-2 gap-2">
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
    </fieldset>
  )
}
