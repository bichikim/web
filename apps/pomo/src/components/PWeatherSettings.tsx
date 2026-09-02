import {PSelect} from './PSelect'
import {PSwitch} from './PSwitch'
import {getLocalizedWeatherSceneModeOptions} from '../features/localization'
import type {WeatherLocation, WeatherSceneMode} from '../features/weather'
import * as m from '@paraglide/message'
import {PWeatherLocationSearch} from './PWeatherLocationSearch'

export interface PWeatherSettingsProps {
  readonly enabled?: boolean
  readonly onEnabledChange?: (enabled: boolean) => void
  readonly location?: WeatherLocation
  readonly onLocationChange?: (location: WeatherLocation) => void
  readonly onSceneModeChange?: (mode: WeatherSceneMode) => void
  readonly sceneMode?: WeatherSceneMode
}

export const PWeatherSettings = (props: PWeatherSettingsProps) => (
  <div class="grid items-start gap-4 min-[60rem]:grid-cols-2">
    <PSwitch
      checked={props.enabled ?? true}
      class="col-span-full"
      description={m.weather_show_description()}
      label={m.weather_show()}
      onChange={(enabled) => props.onEnabledChange?.(enabled)}
    />
    <PSelect
      label={m.weather_scene()}
      onChange={(mode) => props.onSceneModeChange?.(mode)}
      options={getLocalizedWeatherSceneModeOptions()}
      value={props.sceneMode ?? 'auto'}
    />
    <PWeatherLocationSearch location={props.location} onChange={props.onLocationChange} />
    <p class="col-span-full m-0 text-xs leading-5 text-muted-foreground">
      <a
        class="text-inherit underline"
        href="https://openweathermap.org/"
        rel="noreferrer"
        target="_blank"
      >
        {m.weather_support_notice()}
      </a>
    </p>
  </div>
)
