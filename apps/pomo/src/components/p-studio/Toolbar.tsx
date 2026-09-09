import type {BackgroundController} from 'src/features/background'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {getPomoIconClass} from '../icon-style'
import {
  type PSceneMotionInput,
  type PSceneMotionMode,
  type PSceneStyle,
} from '../../features/focus-room-animation/index'
import {type PActivity, type PGaze} from '../../features/focus-room-scene-preferences/index'
import type {SceneTimeMode} from '../../features/focus-room-time/index'
import {type ScreenSaverDelay} from '../../features/screen-saver/index'
import {
  type WeatherLocation,
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
import {MemoryAssistPanel} from './MemoryAssistPanel'
import {VersionNoticePanel} from './VersionNoticePanel'
import {GLASS_ICON_BUTTON} from '../button-presets'
import {PButton} from '../PButton'

interface SceneToolbarProps {
  readonly background?: BackgroundController
  readonly activity: PActivity
  readonly canUseGyroscope?: boolean
  readonly tourButtonVisible?: boolean
  readonly onTourButtonVisibleChange?: (visible: boolean) => void
  readonly dialogueComposerVisible?: boolean
  readonly gaze: PGaze
  readonly isSceneTransitioning: boolean
  readonly onActivityChange: (activity: PActivity) => void
  readonly onDialogueComposerVisibleChange?: (visible: boolean) => void
  readonly onGazeChange: (gaze: PGaze) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
  readonly onMotionModeChange: (motionMode: PSceneMotionMode) => void
  readonly onScreenSaverDelayChange: (delay: ScreenSaverDelay) => void
  readonly onSceneStyleChange: (sceneStyle: PSceneStyle) => void
  readonly onTimeModeChange: (mode: SceneTimeMode) => void
  readonly onTourOpen?: () => void
  readonly onWeatherEnabledChange: (enabled: boolean) => void
  readonly onWeatherLocationChange: (location: WeatherLocation) => void
  readonly onWeatherSceneModeChange: (mode: WeatherSceneMode) => void
  readonly screenSaverDelay: ScreenSaverDelay
  readonly sceneStyle: PSceneStyle
  readonly motionInput?: PSceneMotionInput
  readonly motionMode: PSceneMotionMode
  readonly timeMode: SceneTimeMode
  readonly weatherEnabled: boolean
  readonly weatherLocation: WeatherLocation
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
      <div
        class="flex flex-wrap justify-end gap-2 [&_button[data-icon-only]]:rounded-full"
        role="group"
        aria-label={m.scene_group_label()}
      >
        <VersionNoticePanel sceneStyle={props.sceneStyle} />
        <Show when={props.onTourOpen !== undefined && (props.tourButtonVisible ?? true)}>
          <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
            <div class="inline-flex" data-tour-step="tour">
              <PButton
                {...GLASS_ICON_BUTTON}
                accessibleLabel={m.tour_open()}
                tooltip={m.tour_open()}
                class={cx(GLASS_ICON_BUTTON.class, 'pomo-tour-control')}
                icon={getPomoIconClass('i-tabler-route', props.sceneStyle)}
                onPress={() => props.onTourOpen?.()}
              />
            </div>
          </PScribbleCircleControl>
        </Show>
        <div class="inline-flex" data-tour-step="memory-assist">
          <MemoryAssistPanel sceneStyle={props.sceneStyle} weatherState={props.weatherState} />
        </div>
        <div class="inline-flex" data-tour-step="settings">
          <SceneSettingsPanel
            background={props.background}
            activity={props.activity}
            canUseGyroscope={props.canUseGyroscope}
            tourButtonVisible={props.tourButtonVisible}
            onTourButtonVisibleChange={props.onTourButtonVisibleChange}
            dialogueComposerVisible={props.dialogueComposerVisible}
            gaze={props.gaze}
            onActivityChange={props.onActivityChange}
            onDialogueComposerVisibleChange={props.onDialogueComposerVisibleChange}
            onGazeChange={props.onGazeChange}
            onMotionInputChange={props.onMotionInputChange}
            onMotionModeChange={props.onMotionModeChange}
            onScreenSaverDelayChange={props.onScreenSaverDelayChange}
            onSceneStyleChange={props.onSceneStyleChange}
            onTimeModeChange={props.onTimeModeChange}
            onWeatherEnabledChange={props.onWeatherEnabledChange}
            onWeatherLocationChange={props.onWeatherLocationChange}
            onWeatherSceneModeChange={props.onWeatherSceneModeChange}
            screenSaverDelay={props.screenSaverDelay}
            sceneStyle={props.sceneStyle}
            motionInput={props.motionInput}
            motionMode={props.motionMode}
            timeMode={props.timeMode}
            weatherEnabled={props.weatherEnabled}
            weatherLocation={props.weatherLocation}
            weatherSceneMode={props.weatherSceneMode}
          />
        </div>
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
