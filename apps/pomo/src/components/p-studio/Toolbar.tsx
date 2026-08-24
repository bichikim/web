import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {getPomoIconClass} from '../../design-system/icon-style'
import {PIconButton} from '../../design-system/PIconButton'
import {PSelect} from '../../design-system/PSelect'
import {
  type PSceneMotionInput,
  type PSceneMotionMode,
  type PSceneStyle,
} from '../../features/focus-room-animation/index'
import {
  FOCUS_ROOM_ACTIVITY_OPTIONS,
  FOCUS_ROOM_GAZE_OPTIONS,
  FOCUS_ROOM_TIME_OPTIONS,
  type PActivity,
  type PGaze,
} from '../../features/focus-room-scene-preferences/index'
import {getNextTimeMode, type SceneTimeMode} from '../../features/focus-room-time/index'
import {type ScreenSaverDelay} from '../../features/screen-saver/index'
import {type WeatherCitySlug, type WeatherState} from '../../features/weather/index'
import {PScribbleCircleControl} from '../PScribbleCircleControl'
import {SceneSettingsPanel} from './SettingsPanel'
import {CLASSES, findLabel, SceneTime} from './shared'
import {PWeatherStatus} from '../PWeatherStatus'

interface SceneToolbarProps {
  readonly activity: PActivity
  readonly canUseGyroscope?: boolean
  readonly gaze: PGaze
  readonly isSceneTransitioning: boolean
  readonly onActivityChange: (activity: PActivity) => void
  readonly onGazeChange: (gaze: PGaze) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
  readonly onMotionModeChange: (motionMode: PSceneMotionMode) => void
  readonly onScreenSaverDelayChange: (delay: ScreenSaverDelay) => void
  readonly onSceneStyleChange: (sceneStyle: PSceneStyle) => void
  readonly onTimeModeChange: (mode: SceneTimeMode) => void
  readonly onWeatherCityChange: (citySlug: WeatherCitySlug) => void
  readonly onWeatherEnabledChange: (enabled: boolean) => void
  readonly screenSaverDelay: ScreenSaverDelay
  readonly sceneStyle: PSceneStyle
  readonly motionInput?: PSceneMotionInput
  readonly motionMode: PSceneMotionMode
  readonly time: SceneTime
  readonly timeMode: SceneTimeMode
  readonly weatherCitySlug: WeatherCitySlug
  readonly weatherEnabled: boolean
  readonly weatherState: WeatherState
}

export const SceneToolbar = (props: SceneToolbarProps) => {
  const timeModeOption = () =>
    FOCUS_ROOM_TIME_OPTIONS.find((option) => option.value === props.timeMode) ??
    FOCUS_ROOM_TIME_OPTIONS[0]
  const timeAccessibleLabel = () => {
    const option = timeModeOption()

    return option.value === 'auto'
      ? `시간대 자동, 현재 ${findLabel(FOCUS_ROOM_TIME_OPTIONS, props.time)}`
      : `시간대 ${option.label}`
  }

  return (
    <div
      class={cx(
        'pointer-events-auto absolute right-4 top-[calc(1rem+var(--pomo-safe-area-inset-top))]',
        'flex flex-col items-end gap-2',
        'xs:right-7 lg:top-6',
      )}
    >
      <div class="flex flex-wrap justify-end gap-2" role="group" aria-label="장면 설정">
        <PScribbleCircleControl class="max-lg:hidden" enabled={props.sceneStyle === 'scribble'}>
          <PIconButton
            accessibleLabel={timeAccessibleLabel()}
            class={CLASSES.sceneControl}
            feedback={timeModeOption().label}
            icon={getPomoIconClass(timeModeOption().icon, props.sceneStyle)}
            onPress={() => props.onTimeModeChange(getNextTimeMode(props.timeMode))}
          />
        </PScribbleCircleControl>
        <PScribbleCircleControl class="max-lg:hidden" enabled={props.sceneStyle === 'scribble'}>
          <PSelect
            appearance="icon"
            class={CLASSES.sceneControl}
            getIconClass={(icon) => getPomoIconClass(icon, props.sceneStyle)}
            hideLabel
            label="행동"
            onChange={props.onActivityChange}
            options={FOCUS_ROOM_ACTIVITY_OPTIONS}
            value={props.activity}
          />
        </PScribbleCircleControl>
        <PScribbleCircleControl class="max-lg:hidden" enabled={props.sceneStyle === 'scribble'}>
          <PSelect
            appearance="icon"
            class={CLASSES.sceneControl}
            getIconClass={(icon) => getPomoIconClass(icon, props.sceneStyle)}
            hideLabel
            label="보기"
            onChange={props.onGazeChange}
            options={FOCUS_ROOM_GAZE_OPTIONS}
            value={props.gaze}
          />
        </PScribbleCircleControl>
        <SceneSettingsPanel
          activity={props.activity}
          canUseGyroscope={props.canUseGyroscope}
          gaze={props.gaze}
          onActivityChange={props.onActivityChange}
          onGazeChange={props.onGazeChange}
          onMotionInputChange={props.onMotionInputChange}
          onMotionModeChange={props.onMotionModeChange}
          onScreenSaverDelayChange={props.onScreenSaverDelayChange}
          onSceneStyleChange={props.onSceneStyleChange}
          onTimeModeChange={props.onTimeModeChange}
          onWeatherCityChange={props.onWeatherCityChange}
          onWeatherEnabledChange={props.onWeatherEnabledChange}
          screenSaverDelay={props.screenSaverDelay}
          sceneStyle={props.sceneStyle}
          motionInput={props.motionInput}
          motionMode={props.motionMode}
          timeMode={props.timeMode}
          weatherCitySlug={props.weatherCitySlug}
          weatherEnabled={props.weatherEnabled}
          fallback={
            <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
              <span
                aria-hidden="true"
                class={cx(
                  'inline-flex h-control-md min-w-control-md items-center justify-center rounded-control',
                  'border border-solid border-border bg-surface text-foreground shadow-panel',
                )}
              >
                <span
                  class={cx(
                    getPomoIconClass('i-tabler-settings', props.sceneStyle),
                    'size-5 text-highlight',
                  )}
                />
              </span>
            </PScribbleCircleControl>
          }
        />
      </div>
      <PWeatherStatus sceneStyle={props.sceneStyle} state={props.weatherState} />
      <Show when={props.isSceneTransitioning}>
        <span
          aria-live="polite"
          class={cx('border border-solid border-border backdrop-blur-surface', CLASSES.loading)}
          role="status"
        >
          <span aria-hidden="true" class={CLASSES.loadingSpinner} />
          장면 전환 중
        </span>
      </Show>
    </div>
  )
}
