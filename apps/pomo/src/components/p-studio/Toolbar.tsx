import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {getPomoIconClass} from '../icon-style'
import {PIconButton} from '../PIconButton'
import {PSelect} from '../PSelect'
import {
  type PSceneMotionInput,
  type PSceneMotionMode,
  type PSceneStyle,
} from '../../features/focus-room-animation/index'
import {type PActivity, type PGaze} from '../../features/focus-room-scene-preferences/index'
import {
  getLocalizedActivityOptions,
  getLocalizedGazeOptions,
  getLocalizedTimeLabel,
  getLocalizedTimeOptions,
} from '../../features/localization/index'
import {getNextTimeMode, type SceneTimeMode} from '../../features/focus-room-time/index'
import {type ScreenSaverDelay} from '../../features/screen-saver/index'
import {type WeatherCitySlug, type WeatherState} from '../../features/weather/index'
import * as m from '@paraglide/message'
import {PLoadingStatus} from '../PLoadingStatus'
import {PModelDownloadStatus} from '../PModelDownloadStatus'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {SceneSettingsPanel} from './SettingsPanel'
import {CLASSES, SceneTime} from './shared'
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
    getLocalizedTimeOptions().find((option) => option.value === props.timeMode) ??
    getLocalizedTimeOptions()[0]
  const timeAccessibleLabel = () => {
    const option = timeModeOption()

    return option.value === 'auto'
      ? m.scene_time_automatic({time: getLocalizedTimeLabel(props.time)})
      : m.scene_time_selected({time: option.label})
  }

  return (
    <div class={CLASSES.sceneToolbar}>
      <div class="flex flex-wrap justify-end gap-2" role="group" aria-label={m.scene_group_label()}>
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
            label={m.settings_activity()}
            onChange={props.onActivityChange}
            options={getLocalizedActivityOptions()}
            value={props.activity}
          />
        </PScribbleCircleControl>
        <PScribbleCircleControl class="max-lg:hidden" enabled={props.sceneStyle === 'scribble'}>
          <PSelect
            appearance="icon"
            class={CLASSES.sceneControl}
            getIconClass={(icon) => getPomoIconClass(icon, props.sceneStyle)}
            hideLabel
            label={m.settings_view()}
            onChange={props.onGazeChange}
            options={getLocalizedGazeOptions()}
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
      <PModelDownloadStatus />
      <Show when={props.isSceneTransitioning}>
        <span
          aria-live="polite"
          class="border border-solid border-border rounded-control backdrop-blur-surface"
          role="status"
        >
          <PLoadingStatus message={m.scene_transitioning()} />
        </span>
      </Show>
    </div>
  )
}
