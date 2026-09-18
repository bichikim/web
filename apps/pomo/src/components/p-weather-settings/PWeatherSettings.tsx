import {FIELD_DESCRIPTION} from 'src/components/field-classes'
import {PSelect} from '../p-select/PSelect'
import {getLocalizedWeatherSceneModeOptions} from '../../features/localization'
import type {WeatherLocation, WeatherSceneMode} from '../../features/weather'
import * as m from '@paraglide/message'
import {PWeatherLocationSearch} from '../p-weather-location-search/PWeatherLocationSearch'

export interface PWeatherSettingsProps {
  readonly location?: WeatherLocation
  readonly onLocationChange?: (location: WeatherLocation) => void
  readonly onSceneModeChange?: (mode: WeatherSceneMode) => void
  readonly sceneMode?: WeatherSceneMode
}

export const PWeatherSettings = (props: PWeatherSettingsProps) => (
  <div class="grid items-start gap-4 min-[60rem]:grid-cols-2">
    <PSelect
      label={m.weather_scene()}
      onChange={(mode) => props.onSceneModeChange?.(mode)}
      options={getLocalizedWeatherSceneModeOptions()}
      value={props.sceneMode ?? 'auto'}
    />
    <PWeatherLocationSearch location={props.location} onChange={props.onLocationChange} />
    <p class={`col-span-full m-0 ${FIELD_DESCRIPTION}`}>
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
