import * as m from '@paraglide/message'
import {Show} from 'solid-js'
import {PSwitch} from '../p-switch/PSwitch'
import {CLASSES} from '../settings/classes'

export interface PWeatherDisplaySwitchProps {
  readonly weatherEnabled?: boolean
  readonly onWeatherEnabledChange?: (enabled: boolean) => void
}

export const PWeatherDisplaySwitch = (props: PWeatherDisplaySwitchProps) => (
  <Show when={props.onWeatherEnabledChange}>
    {(onChange) => (
      <PSwitch
        checked={props.weatherEnabled ?? true}
        class={CLASSES.settingsToggle}
        description={m.weather_show_description()}
        label={m.weather_show()}
        onChange={onChange()}
      />
    )}
  </Show>
)
