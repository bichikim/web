import {usePDisplayPreferences} from 'src/features/focus-room-display-preferences'

import * as m from '@paraglide/message'

import {SceneToolbar} from '../p-studio/Toolbar'
import {DesktopSurfaceFrame} from './Frame'
import {useDesktopSettingsState} from './use-settings-state'

export const DesktopSettings = () => {
  const displayPreferences = usePDisplayPreferences()
  const settings = useDesktopSettingsState()

  return (
    <DesktopSurfaceFrame
      accessibleLabel={m.desktop_settings_label()}
      class="w-fit"
      isVisible={settings.desktopMode.mode() === 'desktop'}
      title={m.desktop_settings_title()}
    >
      <SceneToolbar
        activity={settings.activity()}
        background={settings.background}
        canUseGyroscope={settings.canUseGyroscope()}
        desktopMode={settings.desktopMode.mode()}
        desktopModeError={settings.desktopMode.error()}
        gaze={settings.gaze()}
        isDesktopModeChanging={settings.desktopMode.isChanging()}
        isSceneTransitioning={false}
        layout="surface"
        memoryAssistVisible={displayPreferences.memoryAssistVisible()}
        motionInput={settings.motionInput()}
        motionMode={settings.motionMode()}
        onActivityChange={settings.onActivityChange}
        onDesktopModeChange={settings.desktopMode.onModeChange}
        onGazeChange={settings.onGazeChange}
        onMemoryAssistVisibleChange={displayPreferences.onMemoryAssistVisibleChange}
        onMotionInputChange={settings.onMotionInputChange}
        onMotionModeChange={settings.onMotionModeChange}
        onPlayerVisibleChange={displayPreferences.onPlayerVisibleChange}
        onPomodoroVisibleChange={displayPreferences.onPomodoroVisibleChange}
        onSceneStyleChange={settings.onSceneStyleChange}
        onScreenSaverDelayChange={settings.onScreenSaverDelayChange}
        onTimeModeChange={settings.onTimeModeChange}
        onToolsButtonVisibleChange={displayPreferences.onToolsButtonVisibleChange}
        onWeatherEnabledChange={settings.onWeatherEnabledChange}
        onWeatherLocationChange={settings.onWeatherLocationChange}
        onWeatherSceneModeChange={settings.onWeatherSceneModeChange}
        playerVisible={displayPreferences.playerVisible()}
        pomodoroVisible={displayPreferences.pomodoroVisible()}
        sceneStyle={settings.sceneStyle()}
        screenSaverDelay={settings.screenSaverDelay()}
        timeMode={settings.timeMode()}
        toolsButtonVisible={displayPreferences.toolsButtonVisible()}
        weatherEnabled={settings.weather.enabled()}
        weatherLocation={settings.weather.location()}
        weatherSceneMode={settings.weather.sceneMode()}
        weatherState={settings.weather.state()}
      />
    </DesktopSurfaceFrame>
  )
}
