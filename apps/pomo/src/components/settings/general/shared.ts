import type {BackgroundController} from 'src/features/background'
import type {PSceneMotionInput, PSceneMotionMode} from '../../../features/focus-room-animation'
import type {PSceneStyle} from '../../../features/focus-room-animation/scene-style'
import type {PActivity, PGaze} from '../../../features/focus-room-scene-preferences'
import type {SceneTimeMode} from '../../../features/focus-room-time'
import type {ScreenSaverDelay} from '../../../features/screen-saver'
import type {WeatherLocation, WeatherSceneMode} from '../../../features/weather'

export const CLASSES = {
  settingsContent: 'pomo-settings__content grid gap-5',
  settingsGrid: 'grid gap-4 min-[60rem]:grid-cols-2',
  settingsScreenSaver: 'pomo-settings__screen-saver grid gap-2 [&_>_div]:w-full',
  settingsSection: 'grid gap-4 border-t border-solid border-border pt-5',
  settingsToggle: 'min-h-12',
} as const

export interface PSettingsProps {
  readonly background?: BackgroundController
  readonly tourButtonVisible?: boolean
  readonly onTourButtonVisibleChange?: (visible: boolean) => void
  readonly activity?: PActivity
  readonly canUseGyroscope?: boolean
  readonly dialogueComposerVisible?: boolean
  readonly gaze?: PGaze
  readonly onActivityChange?: (activity: PActivity) => void
  readonly onDialogueComposerVisibleChange?: (visible: boolean) => void
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
