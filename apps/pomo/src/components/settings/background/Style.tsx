import {Show} from 'solid-js'
import {PRadioSwitch} from '../../PRadioSwitch'
import {PSwitch} from '../../PSwitch'
import {
  getLocalizedMotionInputOptions,
  getLocalizedMotionOptions,
} from '../../../features/localization'
import * as m from '@paraglide/message'
import {P_SCENE_MOTION_INPUT_OPTIONS, P_SCENE_MOTION_OPTIONS} from '../../pomo-scene-options'
import {CLASSES, type PSettingsProps} from '../general/shared'

export const Style = (props: PSettingsProps) => (
  <section aria-label={m.settings_section_style()} class={CLASSES.settingsSection}>
    <div class={CLASSES.settingsGrid}>
      <PSwitch
        checked={(props.sceneStyle ?? 'original') === 'scribble'}
        description={m.settings_scribble_description()}
        label={m.settings_scribble_style()}
        onChange={(isChecked) => props.onSceneStyleChange?.(isChecked ? 'scribble' : 'original')}
      />
      <PRadioSwitch
        label={m.settings_scene_motion()}
        onChange={(motionMode) => props.onMotionModeChange?.(motionMode)}
        options={getLocalizedMotionOptions(P_SCENE_MOTION_OPTIONS)}
        value={props.motionMode ?? 'depth'}
      />
      <Show when={props.canUseGyroscope}>
        <PRadioSwitch
          class="col-span-full"
          label={m.settings_scene_control()}
          onChange={(motionInput) => props.onMotionInputChange?.(motionInput)}
          options={getLocalizedMotionInputOptions(P_SCENE_MOTION_INPUT_OPTIONS)}
          value={props.motionInput ?? 'drag'}
        />
      </Show>
    </div>
  </section>
)
