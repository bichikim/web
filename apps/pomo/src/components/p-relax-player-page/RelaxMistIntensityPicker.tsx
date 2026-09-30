import {type JSX} from 'solid-js'

import * as m from '@paraglide/message'

const PERCENT_SCALE = 100

export interface RelaxMistIntensityPickerProps {
  readonly intensity?: number
  readonly onChange?: (intensity: number) => void
}

export const RelaxMistIntensityPicker = (props: RelaxMistIntensityPickerProps) => {
  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    props.onChange?.(event.currentTarget.valueAsNumber / PERCENT_SCALE)
  }

  return (
    <label class="mt-5 grid gap-2 text-sm text-muted-foreground">
      <span class="flex items-center justify-between gap-3">
        <span>{m.relax_mist_intensity()}</span>
        <output class="tabular-nums">{Math.round((props.intensity ?? 1) * PERCENT_SCALE)}%</output>
      </span>
      <input
        aria-label={m.relax_mist_intensity()}
        class="w-full accent-highlight"
        disabled={props.onChange === undefined}
        max="100"
        min="0"
        onInput={handleInput}
        step="1"
        type="range"
        value={Math.round((props.intensity ?? 1) * PERCENT_SCALE)}
      />
    </label>
  )
}
