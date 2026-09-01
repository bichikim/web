import {NumberField} from '@kobalte/core/number-field'
import {CLASSES} from './shared'

interface DurationFieldProps {
  readonly accessibleLabel: string
  readonly label: string
  readonly max: number
  readonly min: number
  readonly onInput: (value: string) => void
  readonly suffix: string
  readonly value: string
}

export const DurationField = (props: DurationFieldProps) => (
  <NumberField
    class={CLASSES.pomodoroPanelDurationField}
    format={false}
    maxValue={props.max}
    minValue={props.min}
    onChange={props.onInput}
    step={1}
    value={props.value}
  >
    <span aria-hidden="true">{props.label}</span>
    <NumberField.Label class="sr-only">{props.accessibleLabel}</NumberField.Label>
    <span class={CLASSES.pomodoroPanelDurationInput}>
      <NumberField.Input />
      <span>{props.suffix}</span>
    </span>
  </NumberField>
)
