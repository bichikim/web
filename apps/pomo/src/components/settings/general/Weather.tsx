import * as m from '@paraglide/message'
import {PSettingsSectionHeading} from '../SectionHeading'
import {PWeatherSettings} from '../../PWeatherSettings'
import {CLASSES, type PSettingsProps} from './shared'

export const PGeneralWeatherSettings = (props: PSettingsProps) => (
  <section aria-labelledby="pomo-settings-weather-title" class={CLASSES.settingsSection}>
    <PSettingsSectionHeading
      divider="none"
      title={m.settings_section_weather()}
      titleId="pomo-settings-weather-title"
    />
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
