import {Show} from 'solid-js'

import * as m from '@paraglide/message'
import {PRadioSwitch} from 'src/components/p-radio-switch'
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
  <div class="mt-5">
    <PRadioSwitch
      label={m.relax_depth_input_title()}
      onChange={props.onChange}
      options={[
        {label: m.relax_depth_input_drag(), value: 'drag'},
        {label: m.relax_depth_input_gyroscope(), value: 'gyroscope'},
      ]}
      value={props.inputMode}
    />
    <Show when={getStatusMessage(props.status)}>
      {(message) => (
        <p
          aria-label={m.relax_tilt_status()}
          class="mt-2 text-sm text-muted-foreground"
          role="status"
        >
          {message()}
        </p>
      )}
    </Show>
  </div>
)
