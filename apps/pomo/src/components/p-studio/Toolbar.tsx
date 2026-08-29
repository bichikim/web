import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {getPomoIconClass} from '../icon-style'
import {PSelect} from '../PSelect'
import {
  type PSceneMotionInput,
  type PSceneMotionMode,
  type PSceneStyle,
} from '../../features/focus-room-animation/index'
import {type PActivity, type PGaze} from '../../features/focus-room-scene-preferences/index'
import {getLocalizedActivityOptions} from '../../features/localization/index'
import type {SceneTimeMode} from '../../features/focus-room-time/index'
import {type ScreenSaverDelay} from '../../features/screen-saver/index'
import {
  type WeatherCitySlug,
  type WeatherSceneMode,
  type WeatherState,
} from '../../features/weather/index'
import * as m from '@paraglide/message'
import {PLoadingStatus} from '../PLoadingStatus'
import {PModelDownloadStatus} from '../PModelDownloadStatus'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {SceneSettingsPanel} from './SettingsPanel'
import {CLASSES} from './shared'
import {PWeatherStatus} from '../PWeatherStatus'
import {PDesktopModeControl} from '../PDesktopModeControl'
import type {DesktopMode} from '../../features/desktop-mode/index'
import {LearningPanel} from './LearningPanel'

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
  readonly onWeatherSceneModeChange: (mode: WeatherSceneMode) => void
  readonly screenSaverDelay: ScreenSaverDelay
  readonly sceneStyle: PSceneStyle
  readonly motionInput?: PSceneMotionInput
  readonly motionMode: PSceneMotionMode
  readonly timeMode: SceneTimeMode
  readonly weatherCitySlug: WeatherCitySlug
  readonly weatherEnabled: boolean
  readonly weatherSceneMode: WeatherSceneMode
  readonly weatherState: WeatherState
  readonly desktopMode?: DesktopMode
  readonly desktopModeError?: string | null
  readonly isDesktopModeChanging?: boolean
  readonly onDesktopModeChange?: (mode: DesktopMode) => Promise<void>
  readonly layout?: 'studio' | 'surface'
}

export const SceneToolbar = (props: SceneToolbarProps) => {
  return (
    <div
      class={cx(
        props.layout === 'surface' ? 'flex w-full flex-col items-end gap-2' : CLASSES.sceneToolbar,
      )}
    >
      <div class="flex flex-wrap justify-end gap-2" role="group" aria-label={m.scene_group_label()}>
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
        <LearningPanel
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
                    getPomoIconClass('i-tabler-book-2', props.sceneStyle),
                    'size-5 text-highlight',
                  )}
                />
              </span>
            </PScribbleCircleControl>
          }
          sceneStyle={props.sceneStyle}
        />
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
          onWeatherSceneModeChange={props.onWeatherSceneModeChange}
          screenSaverDelay={props.screenSaverDelay}
          sceneStyle={props.sceneStyle}
          motionInput={props.motionInput}
          motionMode={props.motionMode}
          timeMode={props.timeMode}
          weatherCitySlug={props.weatherCitySlug}
          weatherEnabled={props.weatherEnabled}
          weatherSceneMode={props.weatherSceneMode}
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
      <PDesktopModeControl
        error={props.desktopModeError}
        isChanging={props.isDesktopModeChanging}
        mode={props.desktopMode ?? 'normal'}
        onModeChange={(mode) => props.onDesktopModeChange?.(mode) ?? Promise.resolve()}
      />
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
