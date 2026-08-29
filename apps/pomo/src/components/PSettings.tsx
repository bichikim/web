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
import {
  getLocalizedActivityOptions,
  getLocalizedGazeOptions,
  getLocalizedMotionInputOptions,
  getLocalizedMotionOptions,
  getLocalizedTimeOptions,
} from '../features/localization'
import type {SceneTimeMode} from '../features/focus-room-time'
import type {ScreenSaverDelay} from '../features/screen-saver'
import {useScreenWakeLock} from '../features/screen-wake-lock'
import {UserSettings} from './UserSettings'
import type {WeatherCitySlug} from '../features/weather'
import * as m from '@paraglide/message'
import {getLocale, type Locale, setLocale} from '@paraglide/runtime'
import {PCreditsSettings} from './PCreditsSettings'
import {PDialogueSettings} from './PDialogueSettings'
import {PFeedSettings} from './PFeedSettings'
import {PGuideSettings} from './PGuideSettings'
import {P_SCENE_MOTION_INPUT_OPTIONS, P_SCENE_MOTION_OPTIONS} from './pomo-scene-options'
import {PScribbleCircleControl} from './scribble/CircleControl'
import {PSettingsTabList} from './settings/TabList'
import {PWeatherSettings} from './PWeatherSettings'

const CLASSES = {
  settingsContent: 'pomo-settings__content grid gap-5',
  settingsScene: [
    'pomo-settings__scene grid gap-4 pb-5',
    'border-b border-solid border-border lg:hidden',
  ].join(' '),
  settingsScreenSaver: [
    'pomo-settings__screen-saver grid gap-2 pt-4',
    'border-t border-solid border-border [&_>_div]:w-full [&_p]:m-0',
    '[&_p]:text-muted-foreground [&_p]:text-xs [&_p]:leading-4.5',
  ].join(' '),
  settingsWakeLock: 'pomo-settings__wake-lock min-h-12',
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
  readonly onWeatherCityChange?: (citySlug: WeatherCitySlug) => void
  readonly onWeatherEnabledChange?: (enabled: boolean) => void
  readonly screenSaverDelay?: ScreenSaverDelay
  readonly sceneStyle?: PSceneStyle
  readonly motionInput?: PSceneMotionInput
  readonly motionMode?: PSceneMotionMode
  readonly timeMode?: SceneTimeMode
  readonly weatherCitySlug?: WeatherCitySlug
  readonly weatherEnabled?: boolean
}

const LANGUAGE_OPTIONS = [
  {label: '한국어', value: 'ko'},
  {label: 'English', value: 'en'},
] satisfies readonly PSelectOption<Locale>[]

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

export const PSettings = (props: PSettingsProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('general')
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const wakeLock = useScreenWakeLock()
  const wakeLockDescription = createMemo(() => {
    const errorMessage = wakeLock.errorMessage()

    if (errorMessage !== null) {
      return errorMessage
    }

    const availability = wakeLock.availability()
    switch (availability) {
      case 'checking':
        return m.settings_wake_lock_checking()
      case 'supported':
        return wakeLock.isRequestPending()
          ? m.settings_wake_lock_requesting()
          : m.settings_wake_lock_supported()
      case 'unsupported':
        return m.settings_wake_lock_unsupported()
    }

    const exhaustiveAvailability: never = availability
    return exhaustiveAvailability
  })
  const isWakeLockDisabled = () => wakeLock.availability() !== 'supported'
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
            <div class={CLASSES.settingsContent}>
              <PSelect
                label={m.settings_language()}
                onChange={setLocale}
                options={LANGUAGE_OPTIONS}
                value={getLocale()}
              />
              <div class={CLASSES.settingsScene}>
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
              <div class="grid gap-4 border-b border-solid border-border pb-5">
                <PSwitch
                  checked={(props.sceneStyle ?? 'original') === 'scribble'}
                  description={m.settings_scribble_description()}
                  label={m.settings_scribble_style()}
                  onChange={(isChecked) =>
                    props.onSceneStyleChange?.(isChecked ? 'scribble' : 'original')
                  }
                />
                <PRadioSwitch
                  label={m.settings_scene_motion()}
                  onChange={(motionMode) => props.onMotionModeChange?.(motionMode)}
                  options={getLocalizedMotionOptions(P_SCENE_MOTION_OPTIONS)}
                  value={props.motionMode ?? 'depth'}
                />
                <Show when={props.canUseGyroscope}>
                  <PRadioSwitch
                    label={m.settings_scene_control()}
                    onChange={(motionInput) => props.onMotionInputChange?.(motionInput)}
                    options={getLocalizedMotionInputOptions(P_SCENE_MOTION_INPUT_OPTIONS)}
                    value={props.motionInput ?? 'drag'}
                  />
                </Show>
              </div>
              <PWeatherSettings
                citySlug={props.weatherCitySlug}
                enabled={props.weatherEnabled}
                onCityChange={props.onWeatherCityChange}
                onEnabledChange={props.onWeatherEnabledChange}
              />
              <PSwitch
                checked={wakeLock.isEnabled()}
                class={CLASSES.settingsWakeLock}
                description={wakeLockDescription()}
                disabled={isWakeLockDisabled()}
                label={m.settings_wake_lock()}
                onChange={wakeLock.onEnabledChange}
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
