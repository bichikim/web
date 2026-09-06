import {PRadioSwitch} from '../../PRadioSwitch'
import {
  getLocalizedActivityOptions,
  getLocalizedGazeOptions,
  getLocalizedTimeOptions,
} from '../../../features/localization'
import * as m from '@paraglide/message'
import {PSettingsSectionHeading} from '../SectionHeading'
import {CLASSES, type PSettingsProps} from './shared'

export const PGeneralSceneSettings = (props: PSettingsProps) => (
  <section aria-labelledby="pomo-settings-scene-title" class={CLASSES.settingsSection}>
    <PSettingsSectionHeading
      divider="none"
      title={m.settings_section_scene()}
      titleId="pomo-settings-scene-title"
    />
    <div class={`pomo-settings__scene ${CLASSES.settingsGrid}`}>
      <PRadioSwitch
        label={m.settings_time()}
        onChange={(timeMode) => props.onTimeModeChange?.(timeMode)}
        options={getLocalizedTimeOptions()}
        sceneStyle={props.sceneStyle}
        value={props.timeMode ?? 'day'}
      />
      <PRadioSwitch
        label={m.settings_activity()}
        onChange={(activity) => props.onActivityChange?.(activity)}
        options={getLocalizedActivityOptions()}
        sceneStyle={props.sceneStyle}
        value={props.activity ?? 'reading'}
      />
      <PRadioSwitch
        label={m.settings_view()}
        onChange={(gaze) => props.onGazeChange?.(gaze)}
        options={getLocalizedGazeOptions()}
        sceneStyle={props.sceneStyle}
        value={props.gaze ?? 'focused'}
      />
    </div>
  </section>
)
