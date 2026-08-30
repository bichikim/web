import {onCleanup, onMount} from 'solid-js'

import type {PSceneMotionInput, PSceneMotionMode, PSceneStyle} from '../focus-room-animation'
import type {PActivity, PGaze} from '../focus-room-scene-preferences'
import type {SceneTimeMode} from '../focus-room-time'
import type {ScreenSaverDelay} from '../screen-saver'
import {
  LEGACY_WEATHER_LOCATIONS,
  WEATHER_SCENE_MODES,
  type WeatherCitySlug,
  type WeatherLocation,
  weatherLocationSchema,
  type WeatherSceneMode,
} from '../weather'

const SCENE_SETTINGS_CHANNEL = 'pomo:desktop-scene-settings'

type DesktopSceneSetting =
  | {readonly name: 'activity'; readonly value: PActivity}
  | {readonly name: 'gaze'; readonly value: PGaze}
  | {readonly name: 'motionInput'; readonly value: PSceneMotionInput}
  | {readonly name: 'motionMode'; readonly value: PSceneMotionMode}
  | {readonly name: 'sceneStyle'; readonly value: PSceneStyle}
  | {readonly name: 'screenSaverDelay'; readonly value: ScreenSaverDelay}
  | {readonly name: 'timeMode'; readonly value: SceneTimeMode}
  | {readonly name: 'weatherCity'; readonly value: WeatherCitySlug}
  | {readonly name: 'weatherEnabled'; readonly value: boolean}
  | {readonly name: 'weatherLocation'; readonly value: WeatherLocation}
  | {readonly name: 'weatherSceneMode'; readonly value: WeatherSceneMode}

export interface DesktopSceneSettingsHandlers {
  readonly onActivityChange?: (value: PActivity) => void
  readonly onGazeChange?: (value: PGaze) => void
  readonly onMotionInputChange?: (value: PSceneMotionInput) => void
  readonly onMotionModeChange?: (value: PSceneMotionMode) => void
  readonly onSceneStyleChange?: (value: PSceneStyle) => void
  readonly onScreenSaverDelayChange?: (value: ScreenSaverDelay) => void
  readonly onTimeModeChange?: (value: SceneTimeMode) => void
  readonly onWeatherEnabledChange?: (value: boolean) => void
  readonly onWeatherLocationChange?: (value: WeatherLocation) => void
  readonly onWeatherSceneModeChange?: (value: WeatherSceneMode) => void
}

export interface DesktopSceneSettingsPublisher {
  readonly publish: (setting: DesktopSceneSetting) => void
}

type DesktopWeatherSceneSetting = Extract<
  DesktopSceneSetting,
  {readonly name: 'weatherCity' | 'weatherEnabled' | 'weatherLocation' | 'weatherSceneMode'}
>

const isOneOf = <TValue extends string>(
  value: unknown,
  options: ReadonlyArray<TValue>,
): value is TValue => typeof value === 'string' && options.includes(value as TValue)

const isDesktopSceneSetting = (value: unknown): value is DesktopSceneSetting => {
  if (typeof value !== 'object' || value === null || !('name' in value) || !('value' in value)) {
    return false
  }

  const setting = value as {readonly name: unknown; readonly value: unknown}
  switch (setting.name) {
    case 'activity':
      return isOneOf(setting.value, ['reading', 'typing', 'writing'])
    case 'gaze':
      return isOneOf(setting.value, ['focused', 'user'])
    case 'motionInput':
      return isOneOf(setting.value, ['drag', 'gyroscope'])
    case 'motionMode':
      return isOneOf(setting.value, ['depth', 'pan'])
    case 'sceneStyle':
      return isOneOf(setting.value, ['original', 'scribble'])
    case 'screenSaverDelay':
      return isOneOf(setting.value, ['off', '5s', '1m', '10m', '20m', '1h'])
    case 'timeMode':
      return isOneOf(setting.value, ['auto', 'day', 'evening', 'night'])
    case 'weatherCity':
      return isOneOf(setting.value, [
        'busan',
        'daegu',
        'daejeon',
        'gwangju',
        'incheon',
        'jeju',
        'seoul',
        'ulsan',
      ])
    case 'weatherEnabled':
      return typeof setting.value === 'boolean'
    case 'weatherLocation':
      return weatherLocationSchema.safeParse(setting.value).success
    case 'weatherSceneMode':
      return isOneOf(setting.value, WEATHER_SCENE_MODES)
    default:
      return false
  }
}

const applyDesktopWeatherSceneSetting = (
  handlers: DesktopSceneSettingsHandlers,
  setting: DesktopWeatherSceneSetting,
) => {
  switch (setting.name) {
    case 'weatherCity':
      handlers.onWeatherLocationChange?.(LEGACY_WEATHER_LOCATIONS[setting.value])
      return
    case 'weatherEnabled':
      handlers.onWeatherEnabledChange?.(setting.value)
      return
    case 'weatherLocation':
      handlers.onWeatherLocationChange?.(setting.value)
      return
    case 'weatherSceneMode':
      handlers.onWeatherSceneModeChange?.(setting.value)
  }
}

const applyDesktopSceneSetting = (
  handlers: DesktopSceneSettingsHandlers,
  setting: DesktopSceneSetting,
) => {
  switch (setting.name) {
    case 'activity':
      handlers.onActivityChange?.(setting.value)
      return
    case 'gaze':
      handlers.onGazeChange?.(setting.value)
      return
    case 'motionInput':
      handlers.onMotionInputChange?.(setting.value)
      return
    case 'motionMode':
      handlers.onMotionModeChange?.(setting.value)
      return
    case 'sceneStyle':
      handlers.onSceneStyleChange?.(setting.value)
      return
    case 'screenSaverDelay':
      handlers.onScreenSaverDelayChange?.(setting.value)
      return
    case 'timeMode':
      handlers.onTimeModeChange?.(setting.value)
      return
    case 'weatherCity':
    case 'weatherEnabled':
    case 'weatherLocation':
    case 'weatherSceneMode':
      applyDesktopWeatherSceneSetting(handlers, setting)
  }
}

/** Applies validated scene-setting changes sent by another desktop WebView. */
export const useDesktopSceneSettingsListener = (handlers: DesktopSceneSettingsHandlers): void => {
  onMount(() => {
    if (!(import.meta.env.VITE_POMO_IS_DESKTOP === 'true')) {
      return
    }

    const channel = new BroadcastChannel(SCENE_SETTINGS_CHANNEL)
    channel.addEventListener('message', (event) => {
      if (isDesktopSceneSetting(event.data)) {
        applyDesktopSceneSetting(handlers, event.data)
      }
    })
    onCleanup(() => channel.close())
  })
}

/** Publishes scene-setting changes to the other desktop WebViews. */
export const useDesktopSceneSettingsPublisher = (): DesktopSceneSettingsPublisher => {
  let channel: BroadcastChannel | null = null

  onMount(() => {
    if (!(import.meta.env.VITE_POMO_IS_DESKTOP === 'true')) {
      return
    }

    channel = new BroadcastChannel(SCENE_SETTINGS_CHANNEL)
    onCleanup(() => {
      channel?.close()
      channel = null
    })
  })

  return {publish: (setting) => channel?.postMessage(setting)}
}
