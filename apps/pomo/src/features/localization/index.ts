import {
  FOCUS_ROOM_ACTIVITY_OPTIONS,
  FOCUS_ROOM_GAZE_OPTIONS,
  FOCUS_ROOM_TIME_OPTIONS,
  type PActivity,
  type PGaze,
} from '../focus-room-scene-preferences'
import type {PSceneMotionInput, PSceneMotionMode} from '../focus-room-animation'
import type {SceneTimeMode} from '../focus-room-time'
import {
  WEATHER_CITY_SLUGS,
  WEATHER_SCENE_MODES,
  type WeatherCitySlug,
  type WeatherCondition,
  type WeatherLocation,
  type WeatherSceneMode,
} from '../weather'
import * as m from '@paraglide/message'
import type {Locale} from '@paraglide/runtime'

type LocalizationOptions = {readonly locale?: Locale}

export const getLocalizedTimeLabel = (
  timeMode: SceneTimeMode,
  options: LocalizationOptions = {},
) => {
  switch (timeMode) {
    case 'auto':
      return m.scene_time_auto({}, options)
    case 'day':
      return m.scene_time_day({}, options)
    case 'night':
      return m.scene_time_night({}, options)
  }
}

const getLocalizedActivityLabel = (activity: PActivity, options: LocalizationOptions) => {
  switch (activity) {
    case 'reading':
      return m.scene_activity_reading({}, options)
    case 'typing':
      return m.scene_activity_typing({}, options)
    case 'writing':
      return m.scene_activity_writing({}, options)
  }
}

const getLocalizedGazeLabel = (gaze: PGaze, options: LocalizationOptions) => {
  switch (gaze) {
    case 'focused':
      return m.scene_gaze_focused({}, options)
    case 'user':
      return m.scene_gaze_user({}, options)
  }
}

const getLocalizedMotionLabel = (motionMode: PSceneMotionMode, options: LocalizationOptions) => {
  switch (motionMode) {
    case 'depth':
      return m.scene_motion_depth({}, options)
    case 'pan':
      return m.scene_motion_pan({}, options)
  }
}

const getLocalizedMotionInputLabel = (
  motionInput: PSceneMotionInput,
  options: LocalizationOptions,
) => {
  switch (motionInput) {
    case 'drag':
      return m.scene_input_drag({}, options)
    case 'gyroscope':
      return m.scene_input_gyroscope({}, options)
  }
}

export const getLocalizedTimeOptions = (options: LocalizationOptions = {}) =>
  FOCUS_ROOM_TIME_OPTIONS.map((option) => ({
    ...option,
    label: getLocalizedTimeLabel(option.value, options),
  }))

export const getLocalizedActivityOptions = (options: LocalizationOptions = {}) =>
  FOCUS_ROOM_ACTIVITY_OPTIONS.map((option) => ({
    ...option,
    label: getLocalizedActivityLabel(option.value, options),
  }))

export const getLocalizedGazeOptions = (options: LocalizationOptions = {}) =>
  FOCUS_ROOM_GAZE_OPTIONS.map((option) => ({
    ...option,
    label: getLocalizedGazeLabel(option.value, options),
  }))

export const getLocalizedMotionOptions = (
  options: ReadonlyArray<{readonly icon: string; readonly value: PSceneMotionMode}>,
  localizationOptions: LocalizationOptions = {},
) =>
  options.map((option) => ({
    ...option,
    label: getLocalizedMotionLabel(option.value, localizationOptions),
  }))

export const getLocalizedMotionInputOptions = (
  options: ReadonlyArray<{readonly icon: string; readonly value: PSceneMotionInput}>,
  localizationOptions: LocalizationOptions = {},
) =>
  options.map((option) => ({
    ...option,
    label: getLocalizedMotionInputLabel(option.value, localizationOptions),
  }))

export const getLocalizedSceneLabel = (
  time: SceneTimeMode,
  activity: PActivity,
  gaze: PGaze,
  options: LocalizationOptions = {},
) =>
  [
    getLocalizedTimeLabel(time, options),
    getLocalizedActivityLabel(activity, options),
    getLocalizedGazeLabel(gaze, options),
  ].join(' · ')

export const getLocalizedWeatherLabel = (
  condition: WeatherCondition,
  options: LocalizationOptions = {},
) => {
  switch (condition) {
    case 'clear':
      return m.weather_condition_clear({}, options)
    case 'cloudy':
      return m.weather_condition_cloudy({}, options)
    case 'mixed':
      return m.weather_condition_mixed({}, options)
    case 'overcast':
      return m.weather_condition_overcast({}, options)
    case 'rain':
      return m.weather_condition_rain({}, options)
    case 'snow':
      return m.weather_condition_snow({}, options)
    case 'unknown':
      return m.weather_condition_unknown({}, options)
  }
}

export const getLocalizedWeatherCityLabel = (
  citySlug: WeatherCitySlug,
  options: LocalizationOptions = {},
) => {
  switch (citySlug) {
    case 'busan':
      return m.weather_busan({}, options)
    case 'daegu':
      return m.weather_daegu({}, options)
    case 'daejeon':
      return m.weather_daejeon({}, options)
    case 'gwangju':
      return m.weather_gwangju({}, options)
    case 'incheon':
      return m.weather_incheon({}, options)
    case 'jeju':
      return m.weather_jeju({}, options)
    case 'seoul':
      return m.weather_seoul({}, options)
    case 'ulsan':
      return m.weather_ulsan({}, options)
  }
}

export const getLocalizedWeatherCityOptions = (options: LocalizationOptions = {}) =>
  WEATHER_CITY_SLUGS.map((citySlug) => ({
    label: getLocalizedWeatherCityLabel(citySlug, options),
    value: citySlug,
  }))

export const getLocalizedWeatherLocationLabel = (
  location: WeatherLocation,
  options: LocalizationOptions = {},
): string =>
  location.legacyCitySlug === undefined
    ? location.name
    : getLocalizedWeatherCityLabel(location.legacyCitySlug, options)

const getLocalizedWeatherSceneModeLabel = (
  mode: WeatherSceneMode,
  options: LocalizationOptions,
) => {
  switch (mode) {
    case 'auto':
      return m.weather_scene_auto({}, options)
    case 'clear':
    case 'cloudy':
    case 'overcast':
    case 'rain':
    case 'snow':
      return getLocalizedWeatherLabel(mode, options)
  }
}

export const getLocalizedWeatherSceneModeOptions = (options: LocalizationOptions = {}) =>
  WEATHER_SCENE_MODES.map((mode) => ({
    label: getLocalizedWeatherSceneModeLabel(mode, options),
    value: mode,
  }))
