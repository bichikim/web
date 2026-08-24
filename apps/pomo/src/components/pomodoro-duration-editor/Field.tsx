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
  <label class={CLASSES.pomodoroPanelDurationField}>
    <span>{props.label}</span>
    <span class={CLASSES.pomodoroPanelDurationInput}>
      <input
        aria-label={props.accessibleLabel}
        max={props.max}
        min={props.min}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        step="1"
        type="number"
        value={props.value}
      />
      <span>{props.suffix}</span>
    </span>
  </label>
)
