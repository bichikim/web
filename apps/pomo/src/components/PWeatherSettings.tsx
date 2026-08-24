import {Tabs} from '@kobalte/core/tabs'

import {PSelect, type PSelectOption} from '../design-system/PSelect'
import {PSwitch} from '../design-system/PSwitch'
import type {WeatherCitySlug} from '../features/weather'
import * as m from '../paraglide/messages.js'

const getWeatherCityOptions = () =>
  [{label: m.weather_seoul(), value: 'seoul'}] satisfies readonly PSelectOption<WeatherCitySlug>[]

export interface PWeatherSettingsProps {
  readonly citySlug?: WeatherCitySlug
  readonly enabled?: boolean
  readonly onCityChange?: (citySlug: WeatherCitySlug) => void
  readonly onEnabledChange?: (enabled: boolean) => void
}

export const PWeatherSettings = (props: PWeatherSettingsProps) => (
  <Tabs.Content value="weather">
    <div class="grid gap-5">
      <PSwitch
        checked={props.enabled ?? true}
        description={m.weather_show_description()}
        label={m.weather_show()}
        onChange={(enabled) => props.onEnabledChange?.(enabled)}
      />
      <PSelect
        disabled={(props.enabled ?? true) === false}
        label={m.weather_city()}
        onChange={(citySlug) => props.onCityChange?.(citySlug)}
        options={getWeatherCityOptions()}
        value={props.citySlug ?? 'seoul'}
      />
      <p class="m-0 text-xs leading-5 text-muted-foreground">{m.weather_support_notice()}</p>
    </div>
  </Tabs.Content>
)
