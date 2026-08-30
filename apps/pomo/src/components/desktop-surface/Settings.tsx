import {createSignal, onMount} from 'solid-js'

import {
  type PSceneMotionInput,
  type PSceneMotionMode,
  supportsPSceneGyroscope,
  usePSceneStyle,
} from '../../features/focus-room-animation'
import {usePScenePreferences} from '../../features/focus-room-scene-preferences'
import {useScreenSaver} from '../../features/screen-saver'
import {useDesktopMode, useDesktopSceneSettingsPublisher} from '../../features/desktop-mode'
import {useWeather} from '../../features/weather'
import {SceneToolbar} from '../p-studio/Toolbar'
import {DesktopSurfaceFrame} from './Frame'
import * as m from '@paraglide/message'

export const DesktopSettings = () => {
  const desktopMode = useDesktopMode()
  const scenePreferences = usePScenePreferences()
  const sceneStyle = usePSceneStyle()
  const screenSaver = useScreenSaver()
  const weather = useWeather()
  const publisher = useDesktopSceneSettingsPublisher()
  const [motionInput, setMotionInput] = createSignal<PSceneMotionInput>('drag')
  const [motionMode, setMotionMode] = createSignal<PSceneMotionMode>('depth')
  const [canUseGyroscope, setCanUseGyroscope] = createSignal(false)

  onMount(() => {
    const gyroscopeAvailable = supportsPSceneGyroscope()

    setCanUseGyroscope(gyroscopeAvailable)
    if (gyroscopeAvailable) {
      setMotionInput('gyroscope')
    }
  })

  return (
    <DesktopSurfaceFrame
      accessibleLabel={m.desktop_settings_label()}
      class="flex items-start justify-end"
      isVisible={desktopMode.mode() === 'desktop'}
      title={m.desktop_settings_title()}
    >
      <SceneToolbar
        activity={scenePreferences.activity()}
        canUseGyroscope={canUseGyroscope()}
        desktopMode={desktopMode.mode()}
        desktopModeError={desktopMode.error()}
        gaze={scenePreferences.gaze()}
        isDesktopModeChanging={desktopMode.isChanging()}
        isSceneTransitioning={false}
        layout="surface"
        motionInput={motionInput()}
        motionMode={motionMode()}
        onActivityChange={(value) => {
          scenePreferences.onActivityChange(value)
          publisher.publish({name: 'activity', value})
        }}
        onDesktopModeChange={desktopMode.onModeChange}
        onGazeChange={(value) => {
          scenePreferences.onGazeChange(value)
          publisher.publish({name: 'gaze', value})
        }}
        onMotionInputChange={(value) => {
          setMotionInput(value)
          publisher.publish({name: 'motionInput', value})
        }}
        onMotionModeChange={(value) => {
          setMotionMode(value)
          publisher.publish({name: 'motionMode', value})
        }}
        onSceneStyleChange={(value) => {
          sceneStyle.onSceneStyleChange(value)
          publisher.publish({name: 'sceneStyle', value})
        }}
        onScreenSaverDelayChange={(value) => {
          screenSaver.onDelayChange(value)
          publisher.publish({name: 'screenSaverDelay', value})
        }}
        onTimeModeChange={(value) => {
          scenePreferences.onTimeModeChange(value)
          publisher.publish({name: 'timeMode', value})
        }}
        onWeatherEnabledChange={(value) => {
          weather.onEnabledChange(value)
          publisher.publish({name: 'weatherEnabled', value})
        }}
        onWeatherLocationChange={(value) => {
          weather.onLocationChange(value)
          publisher.publish({name: 'weatherLocation', value})
        }}
        onWeatherSceneModeChange={(value) => {
          weather.onSceneModeChange(value)
          publisher.publish({name: 'weatherSceneMode', value})
        }}
        sceneStyle={sceneStyle.sceneStyle()}
        screenSaverDelay={screenSaver.delay()}
        timeMode={scenePreferences.timeMode()}
        weatherEnabled={weather.enabled()}
        weatherLocation={weather.location()}
        weatherSceneMode={weather.sceneMode()}
        weatherState={weather.state()}
      />
    </DesktopSurfaceFrame>
  )
}
