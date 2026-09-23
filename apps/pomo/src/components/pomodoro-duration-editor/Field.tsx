import {PNumberInput} from 'src/components/p-number-input/PNumberInput'
import {CLASSES} from './shared'

interface DurationFieldProps {
  readonly accessibleLabel: string
  readonly label: string
  readonly max: number
  readonly min: number
  readonly decrementLabel?: string
  readonly incrementLabel?: string
  readonly onInput: (value: string) => void
  readonly suffix: string
  readonly value: string
}

export const DurationField = (props: DurationFieldProps) => (
  <label class={CLASSES.pomodoroPanelDurationField}>
    <span>{props.label}</span>
    <PNumberInput
      aria-label={props.accessibleLabel}
      class="w-full"
      decrementLabel={props.decrementLabel}
      incrementLabel={props.incrementLabel}
      max={props.max}
      min={props.min}
      onInputValueChange={props.onInput}
      onValueChange={(value) => props.onInput(String(value))}
      step={1}
      unit={props.suffix}
      value={props.value}
    />
  </label>
)
