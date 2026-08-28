import {createMemo, createSignal, onCleanup, onMount} from 'solid-js'

import {
  type PSceneMotionInput,
  type PSceneMotionMode,
  supportsPSceneGyroscope,
  usePSceneStyle,
} from '../../features/focus-room-animation'
import {usePScenePreferences} from '../../features/focus-room-scene-preferences'
import {getAutomaticScenePeriod, resolveScenePeriod} from '../../features/focus-room-time'
import {useScreenSaver} from '../../features/screen-saver'
import {useDesktopMode, useDesktopSceneSettingsPublisher} from '../../features/desktop-mode'
import {useWeather} from '../../features/weather'
import {SceneToolbar} from '../p-studio/Toolbar'
import {DesktopSurfaceFrame} from './Frame'
import * as m from '@paraglide/message'

const AUTOMATIC_PERIOD_REFRESH = 60_000

export const DesktopSettings = () => {
  const desktopMode = useDesktopMode()
  const scenePreferences = usePScenePreferences()
  const sceneStyle = usePSceneStyle()
  const screenSaver = useScreenSaver()
  const weather = useWeather()
  const publisher = useDesktopSceneSettingsPublisher()
  const [automaticPeriod, setAutomaticPeriod] = createSignal(getAutomaticScenePeriod(new Date()))
  const [motionInput, setMotionInput] = createSignal<PSceneMotionInput>('drag')
  const [motionMode, setMotionMode] = createSignal<PSceneMotionMode>('depth')
  const [canUseGyroscope, setCanUseGyroscope] = createSignal(false)
  const time = createMemo(() => resolveScenePeriod(scenePreferences.timeMode(), automaticPeriod()))

  onMount(() => {
    const gyroscopeAvailable = supportsPSceneGyroscope()
    const updateAutomaticPeriod = () => setAutomaticPeriod(getAutomaticScenePeriod(new Date()))
    const timer = window.setInterval(updateAutomaticPeriod, AUTOMATIC_PERIOD_REFRESH)

    setCanUseGyroscope(gyroscopeAvailable)
    if (gyroscopeAvailable) {
      setMotionInput('gyroscope')
    }
    updateAutomaticPeriod()
    onCleanup(() => window.clearInterval(timer))
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
        onWeatherCityChange={(value) => {
          weather.onCityChange(value)
          publisher.publish({name: 'weatherCity', value})
        }}
        onWeatherEnabledChange={(value) => {
          weather.onEnabledChange(value)
          publisher.publish({name: 'weatherEnabled', value})
        }}
        sceneStyle={sceneStyle.sceneStyle()}
        screenSaverDelay={screenSaver.delay()}
        time={time()}
        timeMode={scenePreferences.timeMode()}
        weatherCitySlug={weather.citySlug()}
        weatherEnabled={weather.enabled()}
        weatherState={weather.state()}
      />
    </DesktopSurfaceFrame>
  )
}
