import * as m from '@paraglide/message'
import {PWeatherSettings} from '../../p-weather-settings/PWeatherSettings'
import {CLASSES} from '../classes'
import type {PSettingsProps} from '../types'

export const Weather = (props: PSettingsProps) => (
  <section aria-label={m.settings_section_weather()} class={CLASSES.settingsSection}>
    <PWeatherSettings
      location={props.weatherLocation}
      onLocationChange={props.onWeatherLocationChange}
      onSceneModeChange={props.onWeatherSceneModeChange}
      sceneMode={props.weatherSceneMode}
    />
  </section>
)
