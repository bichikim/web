import {Switch} from '@kobalte/core/switch'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

import './FocusRoomSwitch.css'

export interface FocusRoomSwitchProps {
  readonly checked: boolean
  readonly class?: string
  readonly description?: string
  readonly disabled?: boolean
  readonly label: string
  readonly onChange: (isChecked: boolean) => void
}

export const FocusRoomSwitch = (props: FocusRoomSwitchProps) => (
  <Switch
    checked={props.checked}
    class={cx('focus-room-switch', props.class)}
    disabled={props.disabled}
    onChange={props.onChange}
  >
    <div class="focus-room-switch__copy">
      <Switch.Label class="focus-room-switch__label">{props.label}</Switch.Label>
      <Show when={props.description}>
        {(description) => (
          <Switch.Description class="focus-room-switch__description">
            {description()}
          </Switch.Description>
        )}
      </Show>
    </div>
    <Switch.Input />
    <Switch.Control class="focus-room-switch__control">
      <Switch.Thumb class="focus-room-switch__thumb" />
    </Switch.Control>
  </Switch>
)
