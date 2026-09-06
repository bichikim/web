import * as m from '@paraglide/message'
import {PWeatherSettings} from '../../PWeatherSettings'
import {CLASSES, type PSettingsProps} from './shared'

export const PGeneralWeatherSettings = (props: PSettingsProps) => (
  <section aria-label={m.settings_section_weather()} class={CLASSES.settingsSection}>
    <PWeatherSettings
      enabled={props.weatherEnabled}
      onEnabledChange={props.onWeatherEnabledChange}
      location={props.weatherLocation}
      onLocationChange={props.onWeatherLocationChange}
      onSceneModeChange={props.onWeatherSceneModeChange}
      sceneMode={props.weatherSceneMode}
    />
  </section>
)
