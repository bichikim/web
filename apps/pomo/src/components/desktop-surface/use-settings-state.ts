import {createSignal, onMount} from 'solid-js'

import {useBackground} from 'src/features/background'
import {useDesktopMode, useDesktopSceneSettingsPublisher} from '../../features/desktop-mode'
import {
  type PSceneMotionInput,
  type PSceneMotionMode,
  supportsPSceneGyroscope,
  usePSceneStyle,
} from '../../features/focus-room-animation'
import {usePScenePreferences} from '../../features/focus-room-scene-preferences'
import {useScreenSaver} from '../../features/screen-saver'
import {useWeather} from '../../features/weather'

export interface UseDesktopSettingsStateProps {
  readonly isHandoffOwner?: boolean
}

/** Owns the scene-setting state shared by the desktop toolbar and its settings window. */
export const useDesktopSettingsState = (props: UseDesktopSettingsStateProps = {}) => {
  const background = useBackground()
  const desktopMode = useDesktopMode({isHandoffOwner: props.isHandoffOwner})
  const scenePreferences = usePScenePreferences()
  const sceneStyle = usePSceneStyle()
  const screenSaver = useScreenSaver()
  const weather = useWeather()
  const [motionInput, setMotionInput] = createSignal<PSceneMotionInput>('drag')
  const [motionMode, setMotionMode] = createSignal<PSceneMotionMode>('depth')
  const [canUseGyroscope, setCanUseGyroscope] = createSignal(false)

  const publisher = useDesktopSceneSettingsPublisher({
    handlers: {
      onActivityChange: scenePreferences.onActivityChange,
      onGazeChange: scenePreferences.onGazeChange,
      onMotionInputChange: setMotionInput,
      onMotionModeChange: setMotionMode,
      onSceneStyleChange: sceneStyle.onSceneStyleChange,
      onScreenSaverDelayChange: screenSaver.onDelayChange,
      onTimeModeChange: scenePreferences.onTimeModeChange,
      onWeatherEnabledChange: weather.onEnabledChange,
      onWeatherLocationChange: weather.onLocationChange,
      onWeatherSceneModeChange: weather.onSceneModeChange,
    },
    requestSnapshot: true,
  })

  onMount(() => {
    setCanUseGyroscope(supportsPSceneGyroscope())
  })

  return {
    activity: scenePreferences.activity,
    background,
    canUseGyroscope,
    desktopMode,
    gaze: scenePreferences.gaze,
    motionInput,
    motionMode,
    onActivityChange: (value: Parameters<typeof scenePreferences.onActivityChange>[0]) => {
      scenePreferences.onActivityChange(value)
      publisher.publish({name: 'activity', value})
    },
    onGazeChange: (value: Parameters<typeof scenePreferences.onGazeChange>[0]) => {
      scenePreferences.onGazeChange(value)
      publisher.publish({name: 'gaze', value})
    },
    onMotionInputChange: (value: PSceneMotionInput) => {
      setMotionInput(value)
      publisher.publish({name: 'motionInput', value})
    },
    onMotionModeChange: (value: PSceneMotionMode) => {
      setMotionMode(value)
      publisher.publish({name: 'motionMode', value})
    },
    onSceneStyleChange: (value: Parameters<typeof sceneStyle.onSceneStyleChange>[0]) => {
      sceneStyle.onSceneStyleChange(value)
      publisher.publish({name: 'sceneStyle', value})
    },
    onScreenSaverDelayChange: (value: Parameters<typeof screenSaver.onDelayChange>[0]) => {
      screenSaver.onDelayChange(value)
      publisher.publish({name: 'screenSaverDelay', value})
    },
    onTimeModeChange: (value: Parameters<typeof scenePreferences.onTimeModeChange>[0]) => {
      scenePreferences.onTimeModeChange(value)
      publisher.publish({name: 'timeMode', value})
    },
    onWeatherEnabledChange: (value: Parameters<typeof weather.onEnabledChange>[0]) => {
      weather.onEnabledChange(value)
      publisher.publish({name: 'weatherEnabled', value})
    },
    onWeatherLocationChange: (value: Parameters<typeof weather.onLocationChange>[0]) => {
      weather.onLocationChange(value)
      publisher.publish({name: 'weatherLocation', value})
    },
    onWeatherSceneModeChange: (value: Parameters<typeof weather.onSceneModeChange>[0]) => {
      weather.onSceneModeChange(value)
      publisher.publish({name: 'weatherSceneMode', value})
    },
    sceneStyle: sceneStyle.sceneStyle,
    screenSaverDelay: screenSaver.delay,
    timeMode: scenePreferences.timeMode,
    weather: {
      enabled: weather.enabled,
      location: weather.location,
      sceneMode: weather.sceneMode,
      state: weather.state,
    },
  }
}
