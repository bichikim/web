import {cx} from 'class-variance-authority'
import {createSignal, type JSX} from 'solid-js'
import type {CompositionField} from './presets'
import type {CompositionPart} from './types'

export interface PTransformFieldProps {
  field: CompositionField
  part: CompositionPart
  onChange?: (patch: Partial<CompositionPart>) => void
}

export function PTransformField(props: PTransformFieldProps) {
  const [draft, setDraft] = createSignal<string | null>(null)
  const handleBlur = () => setDraft(null)
  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    const input = event.currentTarget
    const value = input.valueAsNumber
    if (!Number.isFinite(value)) {
      setDraft(input.value)
      return
    }
    const clamped = Math.min(props.field.max, Math.max(props.field.min, value))
    setDraft(clamped === value ? null : input.value)
    props.onChange?.({[props.field.key]: clamped})
  }

  return (
    <label class="grid gap-2 text-xs text-#ccc2d0">
      {props.field.label}
      <input
        class={cx(
          'min-h-10 w-full rounded-lg border border-#ffffff/15 bg-#17131f px-3 text-sm text-white',
          'focus-visible:outline-2 focus-visible:outline-#f0c99a',
        )}
        max={props.field.max}
        min={props.field.min}
        onBlur={handleBlur}
        onInput={handleInput}
        readonly={props.onChange === undefined}
        step={props.field.step}
        type="number"
        value={draft() ?? props.part[props.field.key]}
      />
    </label>
  )
}
