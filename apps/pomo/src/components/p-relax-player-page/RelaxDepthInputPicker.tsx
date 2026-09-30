import {For, Show} from 'solid-js'
import {cx} from 'class-variance-authority'

import * as m from '@paraglide/message'
import type {RelaxDepthInput, RelaxDepthStatus} from './types'

export interface RelaxDepthInputPickerProps {
  readonly inputMode: RelaxDepthInput
  readonly onChange: (mode: RelaxDepthInput) => void
  readonly status: RelaxDepthStatus
}

const getStatusMessage = (status: RelaxDepthStatus) => {
  switch (status) {
    case 'ready':
    case 'active':
      return null
    case 'requesting':
      return m.relax_tilt_requesting()
    case 'waiting':
      return m.relax_depth_input_waiting()
    case 'denied':
      return m.relax_depth_input_denied()
    case 'unavailable':
      return m.relax_depth_input_unavailable()
  }
  const exhaustive: never = status
  return exhaustive
}

export const RelaxDepthInputPicker = (props: RelaxDepthInputPickerProps) => (
  <fieldset class="m-0 mt-5 border-0 p-0">
    <legend class="mb-2 text-sm font-650 text-foreground">{m.relax_depth_input_title()}</legend>
    <div aria-label={m.relax_depth_input_title()} class="grid grid-cols-2 gap-2" role="radiogroup">
      <For each={['drag', 'gyroscope'] as const}>
        {(mode) => (
          <label class="cursor-pointer">
            <input
              checked={props.inputMode === mode}
              class="peer sr-only"
              name="relax-depth-input"
              onChange={() => props.onChange(mode)}
              type="radio"
              value={mode}
            />
            <span
              class={cx(
                'block rounded-panel border border-solid border-border px-3 py-2 text-center text-sm',
                'text-foreground peer-checked:border-highlight peer-checked:bg-surface-strong',
                'peer-focus-visible:shadow-focus',
              )}
            >
              {mode === 'drag' ? m.relax_depth_input_drag() : m.relax_depth_input_gyroscope()}
            </span>
          </label>
        )}
      </For>
    </div>
    <Show when={getStatusMessage(props.status)}>
      {(message) => (
        <p class="mt-2 text-sm text-muted-foreground" role="status">
          {message()}
        </p>
      )}
    </Show>
  </fieldset>
)
