import {PSelect, type PSelectOption} from '../../PSelect'
import {type DisplayThemePreference, useDisplayTheme} from '../../../features/display-theme'
import {type ScreenWakeLockController} from '../../../features/screen-wake-lock'
import * as m from '@paraglide/message'
import {getLocale, type Locale, setLocale} from '@paraglide/runtime'
import {PHealthCheck} from '../../PHealthCheck'
import {CLASSES, type PSettingsProps} from './shared'
import {PGeneralDisplaySettings} from './Display'

const LANGUAGE_OPTIONS = [
  {label: '한국어', value: 'ko'},
  {label: 'English', value: 'en'},
] satisfies readonly PSelectOption<Locale>[]

const getDisplayThemeOptions = () =>
  [
    {label: m.settings_theme_dark(), value: 'dark'},
    {label: m.settings_theme_bright(), value: 'bright'},
    {label: m.settings_theme_system(), value: 'system'},
  ] satisfies readonly PSelectOption<DisplayThemePreference>[]

interface PGeneralSettingsProps extends PSettingsProps {
  readonly wakeLock: ScreenWakeLockController
}

export const PGeneralSettings = (props: PGeneralSettingsProps) => {
  const displayTheme = useDisplayTheme()

  return (
    <div class={CLASSES.settingsContent}>
      <div class={CLASSES.settingsGrid}>
        <PSelect
          label={m.settings_language()}
          onChange={setLocale}
          options={LANGUAGE_OPTIONS}
          value={getLocale()}
        />
        <PSelect
          label={m.settings_theme()}
          onChange={displayTheme.onPreferenceChange}
          options={getDisplayThemeOptions()}
          value={displayTheme.preference()}
        />
      </div>
      <PGeneralDisplaySettings {...props} />
      <PHealthCheck />
    </div>
  )
}
