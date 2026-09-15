import {usePDisplayPreferences} from 'src/features/focus-room-display-preferences'
import {useUiAutoHide} from 'src/features/ui-auto-hide'

import {closeDesktopDialog} from '../../features/desktop-mode/dialogs'
import {PSettings} from '../p-settings/PSettings'
import {useDesktopSettingsState} from '../desktop-surface/use-settings-state'

export const DesktopSettingsDialog = () => {
  const displayPreferences = usePDisplayPreferences()
  const settings = useDesktopSettingsState()
  const uiAutoHide = useUiAutoHide()

  return (
    <PSettings
      activity={settings.activity()}
      background={settings.background}
      canUseGyroscope={settings.canUseGyroscope()}
      dialogueComposerVisible={displayPreferences.dialogueComposerVisible()}
      gaze={settings.gaze()}
      memoryAssistVisible={displayPreferences.memoryAssistVisible()}
      motionInput={settings.motionInput()}
      motionMode={settings.motionMode()}
      onActivityChange={settings.onActivityChange}
      onDialogueComposerVisibleChange={displayPreferences.onDialogueComposerVisibleChange}
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
      onTourButtonVisibleChange={displayPreferences.onTourButtonVisibleChange}
      onWeatherEnabledChange={settings.onWeatherEnabledChange}
      onWeatherLocationChange={settings.onWeatherLocationChange}
      onWeatherSceneModeChange={settings.onWeatherSceneModeChange}
      playerVisible={displayPreferences.playerVisible()}
      pomodoroVisible={displayPreferences.pomodoroVisible()}
      presentation="window"
      sceneStyle={settings.sceneStyle()}
      screenSaverDelay={settings.screenSaverDelay()}
      timeMode={settings.timeMode()}
      toolsButtonVisible={displayPreferences.toolsButtonVisible()}
      tourButtonVisible={displayPreferences.tourButtonVisible()}
      uiAutoHide={uiAutoHide}
      weatherEnabled={settings.weather.enabled()}
      weatherLocation={settings.weather.location()}
      weatherSceneMode={settings.weather.sceneMode()}
      onRequestClose={() => {
        closeDesktopDialog('settings').catch((error: unknown) => {
          console.error('Failed to close the desktop settings dialog.', error)
        })
      }}
    />
  )
}
