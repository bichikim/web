import {PSelect} from './PSelect'
import {PSwitch} from './PSwitch'
import {getLocalizedWeatherCityOptions} from '../features/localization'
import type {WeatherCitySlug} from '../features/weather'
import * as m from '@paraglide/message'

export interface PWeatherSettingsProps {
  readonly citySlug?: WeatherCitySlug
  readonly enabled?: boolean
  readonly onCityChange?: (citySlug: WeatherCitySlug) => void
  readonly onEnabledChange?: (enabled: boolean) => void
}

export const PWeatherSettings = (props: PWeatherSettingsProps) => (
  <div class="grid gap-4 border-b border-solid border-border pb-5">
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
      options={getLocalizedWeatherCityOptions()}
      value={props.citySlug ?? 'seoul'}
    />
    <p class="m-0 text-xs leading-5 text-muted-foreground">{m.weather_support_notice()}</p>
  </div>
)
