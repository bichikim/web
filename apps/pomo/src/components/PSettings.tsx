import {Tabs} from '@kobalte/core/tabs'
import {createMemo, createSignal, Show} from 'solid-js'

import {getPomoIconClass} from '../design-system/icon-style'
import {PIconButton} from '../design-system/PIconButton'
import {PModal} from '../design-system/PModal'
import {PRadioSwitch} from '../design-system/PRadioSwitch'
import {PSelect, type PSelectOption} from '../design-system/PSelect'
import {PSwitch} from '../design-system/PSwitch'
import type {PSceneMotionInput, PSceneMotionMode} from '../features/focus-room-animation'
import type {PSceneStyle} from '../features/focus-room-animation/scene-style'
import {
  FOCUS_ROOM_ACTIVITY_OPTIONS,
  FOCUS_ROOM_GAZE_OPTIONS,
  FOCUS_ROOM_TIME_OPTIONS,
  type PActivity,
  type PGaze,
} from '../features/focus-room-scene-preferences'
import type {SceneTimeMode} from '../features/focus-room-time'
import type {ScreenSaverDelay} from '../features/screen-saver'
import {useScreenWakeLock} from '../features/screen-wake-lock'
import {UserSettings} from '../features/user-auth/UserSettings'
import type {WeatherCitySlug} from '../features/weather'
import {PCreditsSettings} from './PCreditsSettings'
import {PDialogueSettings} from './PDialogueSettings'
import {PFeedSettings} from './PFeedSettings'
import {PGuideSettings} from './PGuideSettings'
import {P_SCENE_MOTION_INPUT_OPTIONS, P_SCENE_MOTION_OPTIONS} from './pomo-scene-options'
import {PScribbleCircleControl} from './PScribbleCircleControl'
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

const SCREEN_SAVER_DELAY_OPTIONS = [
  {label: '끄기', value: 'off'},
  {label: '1분 후', value: '1m'},
  {label: '10분 후', value: '10m'},
  {label: '20분 후', value: '20m'},
  {label: '1시간 후', value: '1h'},
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
        return '화면 유지 기능을 사용할 수 있는지 확인하고 있어요.'
      case 'supported':
        return wakeLock.isRequestPending()
          ? '화면을 계속 켜 두도록 요청하고 있어요.'
          : '집중하는 동안 화면이 어두워지거나 잠기지 않게 유지해요.'
      case 'unsupported':
        return '이 브라우저에서는 화면 유지 기능을 지원하지 않아요.'
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
          accessibleLabel="설정 열기"
          feedback="설정"
          icon={getPomoIconClass('i-tabler-settings', props.sceneStyle)}
          onPress={handleOpen}
        />
      </PScribbleCircleControl>
      <Tabs value={activeTab()} onChange={setActiveTab}>
        <PModal
          isOpen={isOpen()}
          navigation={<PSettingsTabList />}
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={setIsOpen}
          placement="top"
          size="wide"
          title="Pomofi 설정"
          titleVisibility="visually-hidden"
        >
          <Tabs.Content value="general">
            <div class={CLASSES.settingsContent}>
              <div class={CLASSES.settingsScene}>
                <PRadioSwitch
                  label="시간"
                  onChange={(timeMode) => props.onTimeModeChange?.(timeMode)}
                  options={FOCUS_ROOM_TIME_OPTIONS}
                  sceneStyle={props.sceneStyle}
                  value={props.timeMode ?? 'day'}
                />
                <PRadioSwitch
                  label="행동"
                  onChange={(activity) => props.onActivityChange?.(activity)}
                  options={FOCUS_ROOM_ACTIVITY_OPTIONS}
                  sceneStyle={props.sceneStyle}
                  value={props.activity ?? 'reading'}
                />
                <PRadioSwitch
                  label="보기"
                  onChange={(gaze) => props.onGazeChange?.(gaze)}
                  options={FOCUS_ROOM_GAZE_OPTIONS}
                  sceneStyle={props.sceneStyle}
                  value={props.gaze ?? 'focused'}
                />
              </div>
              <div class="grid gap-4 border-b border-solid border-border pb-5">
                <PSwitch
                  checked={(props.sceneStyle ?? 'original') === 'scribble'}
                  description="준비된 장면을 일부러 서툴게 그린 하찮은 그림으로 바꿔요."
                  label="하찮은 스타일"
                  onChange={(isChecked) =>
                    props.onSceneStyleChange?.(isChecked ? 'scribble' : 'original')
                  }
                />
                <PRadioSwitch
                  label="장면 움직임"
                  onChange={(motionMode) => props.onMotionModeChange?.(motionMode)}
                  options={P_SCENE_MOTION_OPTIONS}
                  value={props.motionMode ?? 'depth'}
                />
                <Show when={props.canUseGyroscope}>
                  <PRadioSwitch
                    label="장면 조작 방식"
                    onChange={(motionInput) => props.onMotionInputChange?.(motionInput)}
                    options={P_SCENE_MOTION_INPUT_OPTIONS}
                    value={props.motionInput ?? 'drag'}
                  />
                </Show>
              </div>
              <PSwitch
                checked={wakeLock.isEnabled()}
                class={CLASSES.settingsWakeLock}
                description={wakeLockDescription()}
                disabled={isWakeLockDisabled()}
                label="화면 자동 꺼짐 방지"
                onChange={wakeLock.onEnabledChange}
              />
              <div class={CLASSES.settingsScreenSaver}>
                <PSelect
                  label="스크린 세이버"
                  onChange={(delay) => props.onScreenSaverDelayChange?.(delay)}
                  options={SCREEN_SAVER_DELAY_OPTIONS}
                  value={props.screenSaverDelay ?? '10m'}
                />
                <p>
                  조작이 없으면 화면을 검게 가려 밝은 고정 화면이 오래 노출되지 않게 해요. 화면을
                  터치하거나 마우스를 움직이거나 클릭하면 바로 돌아옵니다.
                </p>
              </div>
            </div>
          </Tabs.Content>
          <PGuideSettings />
          <PWeatherSettings
            citySlug={props.weatherCitySlug}
            enabled={props.weatherEnabled}
            onCityChange={props.onWeatherCityChange}
            onEnabledChange={props.onWeatherEnabledChange}
          />
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
