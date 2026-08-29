import type {PixiLayerSceneDefinition, PSceneId, PSceneStyle} from '../focus-room-animation'
import clearImage from './assets/scene/day-clear.jpg'
import cloudyImage from './assets/scene/day-cloudy.jpg'
import rainImage from './assets/scene/day-rain.jpg'
import readingUserPrecipitationMask from './assets/scene/day-reading-user-precipitation-effect-mask.png'
import readingUserWindowMask from './assets/scene/day-reading-user-mask.png'
import snowImage from './assets/scene/day-snow.jpg'
import typingPrecipitationMask from './assets/scene/day-typing-focused-precipitation-effect-mask.png'
import typingWindowMask from './assets/scene/day-typing-focused-mask.png'
import typingUserPrecipitationMask from './assets/scene/day-typing-user-precipitation-effect-mask.png'
import typingUserWindowMask from './assets/scene/day-typing-user-mask.png'
import writingPrecipitationMask from './assets/scene/day-writing-focused-precipitation-effect-mask.png'
import writingWindowMask from './assets/scene/day-writing-focused-mask.png'
import writingUserPrecipitationMask from './assets/scene/day-writing-user-precipitation-effect-mask.png'
import writingUserWindowMask from './assets/scene/day-writing-user-mask.png'
import nightClearImage from './assets/scene/night-clear.jpg'
import nightCloudyImage from './assets/scene/night-cloudy.jpg'
import nightOvercastImage from './assets/scene/night-overcast.jpg'
import nightRainImage from './assets/scene/night-rain.jpg'
import nightReadingPrecipitation from './assets/scene/night-reading-user-precipitation-effect-mask.png'
import nightReadingWindow from './assets/scene/night-reading-user-mask.png'
import nightSnowImage from './assets/scene/night-snow.jpg'
import nightTypingPrecipitation from './assets/scene/night-typing-focused-precipitation-effect-mask.png'
import nightTypingWindow from './assets/scene/night-typing-focused-mask.png'
import nightTypingUserPrecipitation from './assets/scene/night-typing-user-precipitation-effect-mask.png'
import nightTypingUserWindow from './assets/scene/night-typing-user-mask.png'
import nightWritingPrecipitation from './assets/scene/night-writing-focused-precipitation-effect-mask.png'
import nightWritingWindow from './assets/scene/night-writing-focused-mask.png'
import nightWritingUserPrecipitation from './assets/scene/night-writing-user-precipitation-effect-mask.png'
import nightWritingUserWindow from './assets/scene/night-writing-user-mask.png'
import overcastImage from './assets/scene/day-overcast.jpg'
import precipitationEffectMask from './assets/scene/precipitation-effect-mask.png'
import windowMask from './assets/scene/day-reading-focused-mask.png'
import type {WeatherSceneCondition} from './scene-mode'

type WeatherSceneId =
  | 'day-reading-focused'
  | 'day-reading-user'
  | 'day-typing-focused'
  | 'day-typing-user'
  | 'day-writing-focused'
  | 'day-writing-user'
  | 'night-reading-focused'
  | 'night-reading-user'
  | 'night-typing-focused'
  | 'night-typing-user'
  | 'night-writing-focused'
  | 'night-writing-user'

interface WeatherMasks {
  readonly precipitation: string
  readonly window: string
}

const NIGHT_PRECIPITATION_OPACITY = 0.4

const DAY_WEATHER_SOURCES = {
  clear: clearImage,
  cloudy: cloudyImage,
  overcast: overcastImage,
  rain: rainImage,
  snow: snowImage,
} satisfies Readonly<Record<WeatherSceneCondition, string>>

const NIGHT_WEATHER_SOURCES = {
  clear: nightClearImage,
  cloudy: nightCloudyImage,
  overcast: nightOvercastImage,
  rain: nightRainImage,
  snow: nightSnowImage,
} satisfies Readonly<Record<WeatherSceneCondition, string>>

const WEATHER_SOURCES = {
  'day-reading-focused': DAY_WEATHER_SOURCES,
  'day-reading-user': DAY_WEATHER_SOURCES,
  'day-typing-focused': DAY_WEATHER_SOURCES,
  'day-typing-user': DAY_WEATHER_SOURCES,
  'day-writing-focused': DAY_WEATHER_SOURCES,
  'day-writing-user': DAY_WEATHER_SOURCES,
  'night-reading-focused': NIGHT_WEATHER_SOURCES,
  'night-reading-user': NIGHT_WEATHER_SOURCES,
  'night-typing-focused': NIGHT_WEATHER_SOURCES,
  'night-typing-user': NIGHT_WEATHER_SOURCES,
  'night-writing-focused': NIGHT_WEATHER_SOURCES,
  'night-writing-user': NIGHT_WEATHER_SOURCES,
} satisfies Readonly<Record<WeatherSceneId, Readonly<Record<WeatherSceneCondition, string>>>>

const WEATHER_MASKS = {
  'day-reading-focused': {precipitation: precipitationEffectMask, window: windowMask},
  'day-reading-user': {
    precipitation: readingUserPrecipitationMask,
    window: readingUserWindowMask,
  },
  'day-typing-focused': {
    precipitation: typingPrecipitationMask,
    window: typingWindowMask,
  },
  'day-typing-user': {
    precipitation: typingUserPrecipitationMask,
    window: typingUserWindowMask,
  },
  'day-writing-focused': {
    precipitation: writingPrecipitationMask,
    window: writingWindowMask,
  },
  'day-writing-user': {
    precipitation: writingUserPrecipitationMask,
    window: writingUserWindowMask,
  },
  'night-reading-focused': {precipitation: precipitationEffectMask, window: windowMask},
  'night-reading-user': {
    precipitation: nightReadingPrecipitation,
    window: nightReadingWindow,
  },
  'night-typing-focused': {
    precipitation: nightTypingPrecipitation,
    window: nightTypingWindow,
  },
  'night-typing-user': {
    precipitation: nightTypingUserPrecipitation,
    window: nightTypingUserWindow,
  },
  'night-writing-focused': {
    precipitation: nightWritingPrecipitation,
    window: nightWritingWindow,
  },
  'night-writing-user': {
    precipitation: nightWritingUserPrecipitation,
    window: nightWritingUserWindow,
  },
} satisfies Readonly<Record<WeatherSceneId, WeatherMasks>>

const isWeatherScene = (sceneId: PSceneId): sceneId is WeatherSceneId => {
  switch (sceneId) {
    case 'day-reading-focused':
    case 'day-reading-user':
    case 'day-typing-focused':
    case 'day-typing-user':
    case 'day-writing-focused':
    case 'day-writing-user':
    case 'night-reading-focused':
    case 'night-reading-user':
    case 'night-typing-focused':
    case 'night-typing-user':
    case 'night-writing-focused':
    case 'night-writing-user':
      return true
    default:
      return false
  }
}

const getWeatherInsertionIndex = (
  scene: PixiLayerSceneDefinition,
  condition: WeatherSceneCondition,
) => {
  if (condition === 'clear') {
    const backgroundIndex = scene.layers.findIndex((layer) => layer.id === 'background')

    return backgroundIndex === -1 ? 0 : backgroundIndex + 1
  }

  const headIndex = scene.layers.findIndex((layer) => layer.id === 'head')

  return headIndex === -1 ? scene.layers.length : headIndex
}

const getWeatherEffect = (
  sceneId: WeatherSceneId,
  condition: WeatherSceneCondition,
  beforeLayerId: string | undefined,
  maskSource: string,
) => {
  const opacity = sceneId.startsWith('night-') ? NIGHT_PRECIPITATION_OPACITY : 1

  switch (condition) {
    case 'clear':
    case 'cloudy':
    case 'overcast':
      return []
    case 'rain':
      return [
        {
          beforeLayerId,
          id: 'weather-rain',
          kind: 'falling-streaks' as const,
          maskSource,
          opacity,
        },
      ]
    case 'snow':
      return [
        {
          beforeLayerId,
          id: 'weather-snow',
          kind: 'falling-flakes' as const,
          maskSource,
          opacity,
        },
      ]
  }
}

/** Overlays the aligned full-room weather frame through the supported window mask. */
export const applyWeatherSceneLayer = (
  scene: PixiLayerSceneDefinition,
  sceneId: PSceneId,
  sceneStyle: PSceneStyle,
  condition: WeatherSceneCondition,
): PixiLayerSceneDefinition => {
  if (!isWeatherScene(sceneId) || sceneStyle !== 'original') {
    return scene
  }

  const headIndex = scene.layers.findIndex((layer) => layer.id === 'head')
  const insertionIndex = getWeatherInsertionIndex(scene, condition)
  const masks = WEATHER_MASKS[sceneId]
  const weatherLayer = {
    id: `weather-${condition}`,
    maskSource: masks.window,
    source: WEATHER_SOURCES[sceneId][condition],
  }

  return {
    ...scene,
    effects: [
      ...(scene.effects ?? []),
      ...getWeatherEffect(
        sceneId,
        condition,
        headIndex === -1 ? undefined : 'head',
        masks.precipitation,
      ),
    ],
    id: `${scene.id}-weather-${condition}`,
    layers: [
      ...scene.layers.slice(0, insertionIndex),
      weatherLayer,
      ...scene.layers.slice(insertionIndex),
    ],
  }
}
