import {cx} from 'class-variance-authority'
import {Tabs} from '@kobalte/core/tabs'
import {createMemo, createSignal, Show} from 'solid-js'

import {getPomoIconClass} from './icon-style'
import {PIconButton} from './PIconButton'
import {PModal} from './PModal'
import {PRadioSwitch} from './PRadioSwitch'
import {PSelect, type PSelectOption} from './PSelect'
import {PSwitch} from './PSwitch'
import type {PSceneMotionInput, PSceneMotionMode} from '../features/focus-room-animation'
import type {PSceneStyle} from '../features/focus-room-animation/scene-style'
import type {PActivity, PGaze} from '../features/focus-room-scene-preferences'
import {type DisplayThemePreference, useDisplayTheme} from '../features/display-theme'
import {useFullscreen} from '../features/fullscreen'
import {
  getLocalizedActivityOptions,
  getLocalizedGazeOptions,
  getLocalizedMotionInputOptions,
  getLocalizedMotionOptions,
  getLocalizedTimeOptions,
} from '../features/localization'
import type {SceneTimeMode} from '../features/focus-room-time'
import type {ScreenSaverDelay} from '../features/screen-saver'
import {type ScreenWakeLockController, useScreenWakeLock} from '../features/screen-wake-lock'
import {UserSettings} from './UserSettings'
import type {WeatherLocation, WeatherSceneMode} from '../features/weather'
import * as m from '@paraglide/message'
import {getLocale, type Locale, setLocale} from '@paraglide/runtime'
import {PCreditsSettings} from './PCreditsSettings'
import {PDialogueSettings} from './PDialogueSettings'
import {PFeedSettings} from './PFeedSettings'
import {PGuideSettings} from './PGuideSettings'
import {P_SCENE_MOTION_INPUT_OPTIONS, P_SCENE_MOTION_OPTIONS} from './pomo-scene-options'
import {PScribbleCircleControl} from './scribble/CircleControl'
import {PSettingsSectionHeading} from './settings/SectionHeading'
import {PSettingsTabList} from './settings/TabList'
import {PWeatherSettings} from './PWeatherSettings'

const CLASSES = {
  settingsContent: 'pomo-settings__content grid gap-5',
  settingsGrid: 'grid gap-4 min-[60rem]:grid-cols-2',
  settingsScreenSaver: cx(
    'pomo-settings__screen-saver grid gap-2 [&_>_div]:w-full [&_p]:m-0',
    '[&_p]:text-muted-foreground [&_p]:text-xs [&_p]:leading-4.5',
  ),
  settingsSection: 'grid gap-4 border-t border-solid border-border pt-5',
  settingsToggle: 'min-h-12',
} as const

export interface PSettingsProps {
  readonly activity?: PActivity
  readonly canUseGyroscope?: boolean
  readonly gaze?: PGaze
  readonly onActivityChange?: (activity: PActivity) => void
  readonly onGazeChange?: (gaze: PGaze) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
  readonly onMotionModeChange?: (motionMode: PSceneMotionMode) => void
  readonly onScreenSaverDelayChange?: (delay: ScreenSaverDelay) => void
  readonly onSceneStyleChange?: (sceneStyle: PSceneStyle) => void
  readonly onTimeModeChange?: (timeMode: SceneTimeMode) => void
  readonly onWeatherEnabledChange?: (enabled: boolean) => void
  readonly onWeatherLocationChange?: (location: WeatherLocation) => void
  readonly onWeatherSceneModeChange?: (mode: WeatherSceneMode) => void
  readonly screenSaverDelay?: ScreenSaverDelay
  readonly sceneStyle?: PSceneStyle
  readonly motionInput?: PSceneMotionInput
  readonly motionMode?: PSceneMotionMode
  readonly timeMode?: SceneTimeMode
  readonly weatherEnabled?: boolean
  readonly weatherLocation?: WeatherLocation
  readonly weatherSceneMode?: WeatherSceneMode
}

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

const getScreenSaverDelayOptions = () =>
  [
    {label: m.settings_delay_off(), value: 'off'},
    ...(import.meta.env.DEV
      ? ([{label: m.settings_delay_five_seconds(), value: '5s'}] as const)
      : []),
    {label: m.settings_delay_one_minute(), value: '1m'},
    {label: m.settings_delay_ten_minutes(), value: '10m'},
    {label: m.settings_delay_twenty_minutes(), value: '20m'},
    {label: m.settings_delay_one_hour(), value: '1h'},
  ] satisfies readonly PSelectOption<ScreenSaverDelay>[]

const PGeneralSceneSettings = (props: PSettingsProps) => (
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
      <div class="lg:hidden">
        <PRadioSwitch
          label={m.settings_activity()}
          onChange={(activity) => props.onActivityChange?.(activity)}
          options={getLocalizedActivityOptions()}
          sceneStyle={props.sceneStyle}
          value={props.activity ?? 'reading'}
        />
      </div>
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

const PGeneralStyleSettings = (props: PSettingsProps) => (
  <section aria-labelledby="pomo-settings-style-title" class={CLASSES.settingsSection}>
    <PSettingsSectionHeading
      divider="none"
      title={m.settings_section_style()}
      titleId="pomo-settings-style-title"
    />
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

const PGeneralWeatherSettings = (props: PSettingsProps) => (
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

interface PGeneralDisplaySettingsProps extends PSettingsProps {
  readonly wakeLock: ScreenWakeLockController
}

const PGeneralDisplaySettings = (props: PGeneralDisplaySettingsProps) => {
  const fullscreen = useFullscreen()
  const fullscreenDescription = createMemo(() => {
    const error = fullscreen.error()
    if (error !== null) {
      switch (error) {
        case 'enter-failed':
          return m.settings_fullscreen_enter_failed()
        case 'exit-failed':
          return m.settings_fullscreen_exit_failed()
      }

      const exhaustiveError: never = error
      return exhaustiveError
    }

    const availability = fullscreen.availability()
    switch (availability) {
      case 'checking':
        return m.settings_fullscreen_checking()
      case 'supported':
        return fullscreen.isRequestPending()
          ? m.settings_fullscreen_requesting()
          : m.settings_fullscreen_supported()
      case 'unsupported':
        return m.settings_fullscreen_unsupported()
    }

    const exhaustiveAvailability: never = availability
    return exhaustiveAvailability
  })
  const wakeLockDescription = createMemo(() => {
    const errorMessage = props.wakeLock.errorMessage()

    if (errorMessage !== null) {
      return errorMessage
    }

    const availability = props.wakeLock.availability()
    switch (availability) {
      case 'checking':
        return m.settings_wake_lock_checking()
      case 'supported':
        return props.wakeLock.isRequestPending()
          ? m.settings_wake_lock_requesting()
          : m.settings_wake_lock_supported()
      case 'unsupported':
        return m.settings_wake_lock_unsupported()
    }

    const exhaustiveAvailability: never = availability
    return exhaustiveAvailability
  })
  const isFullscreenDisabled = () =>
    fullscreen.availability() !== 'supported' || fullscreen.isRequestPending()
  const isWakeLockDisabled = () => props.wakeLock.availability() !== 'supported'

  return (
    <section aria-labelledby="pomo-settings-display-title" class={CLASSES.settingsSection}>
      <PSettingsSectionHeading
        divider="none"
        title={m.settings_section_display()}
        titleId="pomo-settings-display-title"
      />
      <div class={CLASSES.settingsGrid}>
        <PSwitch
          checked={fullscreen.isEnabled()}
          class={CLASSES.settingsToggle}
          description={fullscreenDescription()}
          disabled={isFullscreenDisabled()}
          label={m.settings_fullscreen()}
          onChange={fullscreen.onEnabledChange}
        />
        <PSwitch
          checked={props.wakeLock.isEnabled()}
          class={CLASSES.settingsToggle}
          description={wakeLockDescription()}
          disabled={isWakeLockDisabled()}
          label={m.settings_wake_lock()}
          onChange={props.wakeLock.onEnabledChange}
        />
        <div class={CLASSES.settingsScreenSaver}>
          <PSelect
            label={m.settings_screen_saver()}
            onChange={(delay) => props.onScreenSaverDelayChange?.(delay)}
            options={getScreenSaverDelayOptions()}
            value={props.screenSaverDelay ?? '10m'}
          />
          <p>{m.settings_screen_saver_description()}</p>
        </div>
      </div>
    </section>
  )
}

interface PGeneralSettingsProps extends PSettingsProps {
  readonly wakeLock: ScreenWakeLockController
}

const PGeneralSettings = (props: PGeneralSettingsProps) => {
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
      <PGeneralSceneSettings {...props} />
      <PGeneralStyleSettings {...props} />
      <PGeneralWeatherSettings {...props} />
      <PGeneralDisplaySettings {...props} />
    </div>
  )
}

export const PSettings = (props: PSettingsProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('general')
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const wakeLock = useScreenWakeLock()
  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    setIsOpen(true)
  }
  const handleCloseAutoFocus = () => triggerElement()?.focus()

  return (
    <>
      <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
        <PIconButton
          accessibleLabel={m.settings_open()}
          feedback={m.settings_feedback()}
          icon={getPomoIconClass('i-tabler-settings', props.sceneStyle)}
          onPress={handleOpen}
        />
      </PScribbleCircleControl>
      <Tabs class="contents" value={activeTab()} onChange={setActiveTab}>
        <PModal
          isOpen={isOpen()}
          navigation={<PSettingsTabList />}
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={setIsOpen}
          placement="top"
          size="wide"
          title={m.settings_title()}
          titleVisibility="visually-hidden"
        >
          <Tabs.Content value="general">
            <PGeneralSettings {...props} wakeLock={wakeLock} />
          </Tabs.Content>
          <PGuideSettings />
          <PCreditsSettings />
          <PFeedSettings />
          <PDialogueSettings onRequestClose={() => setIsOpen(false)} />
          <UserSettings />
        </PModal>
      </Tabs>
    </>
  )
}

export default PSettings
