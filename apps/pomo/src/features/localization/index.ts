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
import {getLocale, type Locale} from '@paraglide/runtime'
export * from './weather-description'

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

const WEATHER_CITY_LABELS = {
  andong: (options: LocalizationOptions) => m.weather_andong({}, options),
  asan: (options: LocalizationOptions) => m.weather_asan({}, options),
  busan: (options: LocalizationOptions) => m.weather_busan({}, options),
  changwon: (options: LocalizationOptions) => m.weather_changwon({}, options),
  cheonan: (options: LocalizationOptions) => m.weather_cheonan({}, options),
  cheongju: (options: LocalizationOptions) => m.weather_cheongju({}, options),
  chuncheon: (options: LocalizationOptions) => m.weather_chuncheon({}, options),
  chungju: (options: LocalizationOptions) => m.weather_chungju({}, options),
  daegu: (options: LocalizationOptions) => m.weather_daegu({}, options),
  daejeon: (options: LocalizationOptions) => m.weather_daejeon({}, options),
  gangneung: (options: LocalizationOptions) => m.weather_gangneung({}, options),
  geoje: (options: LocalizationOptions) => m.weather_geoje({}, options),
  gimhae: (options: LocalizationOptions) => m.weather_gimhae({}, options),
  goyang: (options: LocalizationOptions) => m.weather_goyang({}, options),
  gumi: (options: LocalizationOptions) => m.weather_gumi({}, options),
  gunsan: (options: LocalizationOptions) => m.weather_gunsan({}, options),
  gwangju: (options: LocalizationOptions) => m.weather_gwangju({}, options),
  gyeongju: (options: LocalizationOptions) => m.weather_gyeongju({}, options),
  iksan: (options: LocalizationOptions) => m.weather_iksan({}, options),
  incheon: (options: LocalizationOptions) => m.weather_incheon({}, options),
  jeju: (options: LocalizationOptions) => m.weather_jeju({}, options),
  jeonju: (options: LocalizationOptions) => m.weather_jeonju({}, options),
  jinju: (options: LocalizationOptions) => m.weather_jinju({}, options),
  miryang: (options: LocalizationOptions) => m.weather_miryang({}, options),
  mokpo: (options: LocalizationOptions) => m.weather_mokpo({}, options),
  pohang: (options: LocalizationOptions) => m.weather_pohang({}, options),
  sejong: (options: LocalizationOptions) => m.weather_sejong({}, options),
  seongnam: (options: LocalizationOptions) => m.weather_seongnam({}, options),
  seoul: (options: LocalizationOptions) => m.weather_seoul({}, options),
  sokcho: (options: LocalizationOptions) => m.weather_sokcho({}, options),
  suncheon: (options: LocalizationOptions) => m.weather_suncheon({}, options),
  suwon: (options: LocalizationOptions) => m.weather_suwon({}, options),
  ulsan: (options: LocalizationOptions) => m.weather_ulsan({}, options),
  wonju: (options: LocalizationOptions) => m.weather_wonju({}, options),
  yeosu: (options: LocalizationOptions) => m.weather_yeosu({}, options),
  yongin: (options: LocalizationOptions) => m.weather_yongin({}, options),
} satisfies Readonly<Record<WeatherCitySlug, (options: LocalizationOptions) => string>>

export const getLocalizedWeatherCityLabel = (
  citySlug: WeatherCitySlug,
  options: LocalizationOptions = {},
) => WEATHER_CITY_LABELS[citySlug](options)

export const getLocalizedWeatherCityOptions = (options: LocalizationOptions = {}) =>
  WEATHER_CITY_SLUGS.map((citySlug) => ({
    label: getLocalizedWeatherCityLabel(citySlug, options),
    value: citySlug,
  }))

export const getLocalizedWeatherLocationLabel = (
  location: WeatherLocation,
  options: LocalizationOptions = {},
): string => {
  const locale = options.locale ?? getLocale()
  const slug =
    location.legacyCitySlug ??
    (['KR', '대한민국'].includes(location.country)
      ? WEATHER_CITY_SLUGS.find((city) =>
          [
            city,
            getLocalizedWeatherCityLabel(city, {locale: 'en'}),
            getLocalizedWeatherCityLabel(city, {locale: 'ko'}),
          ].some((name) => name.toLowerCase() === location.name.trim().toLowerCase()),
        )
      : undefined)
  return slug === undefined
    ? (location.names?.[locale] ?? location.names?.en ?? location.name)
    : getLocalizedWeatherCityLabel(slug, {locale})
}

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
