import type {PActivity, PixiLayerSceneDefinition, PSceneStyle, PTime} from '../focus-room-animation'
import clearImage from './assets/scene/day-clear.jpg'
import cloudyImage from './assets/scene/day-cloudy.jpg'
import rainImage from './assets/scene/day-rain.jpg'
import dayTypingPrecipitationMask from './assets/scene/day-typing-precipitation-effect-mask.png'
import dayTypingWindowMask from './assets/scene/day-typing-mask.png'
import readingPrecipitationMask from './assets/scene/reading-precipitation-effect-mask.png'
import readingWindowMask from './assets/scene/reading-mask.png'
import snowImage from './assets/scene/day-snow.jpg'
import writingPrecipitationMask from './assets/scene/writing-precipitation-effect-mask.png'
import writingWindowMask from './assets/scene/writing-mask.png'
import nightClearImage from './assets/scene/night-clear.jpg'
import nightCloudyImage from './assets/scene/night-cloudy.jpg'
import nightOvercastImage from './assets/scene/night-overcast.jpg'
import nightRainImage from './assets/scene/night-rain.jpg'
import nightSnowImage from './assets/scene/night-snow.jpg'
import nightTypingPrecipitationMask from './assets/scene/night-typing-precipitation-effect-mask.png'
import nightTypingWindowMask from './assets/scene/night-typing-mask.png'
import overcastImage from './assets/scene/day-overcast.jpg'
import type {WeatherSceneCondition} from './scene-mode'

interface WeatherMasks {
  readonly precipitation: string
  readonly window: string
}

export interface ApplyWeatherSceneLayerOptions {
  readonly activity: PActivity
  readonly condition: WeatherSceneCondition
  readonly scene: PixiLayerSceneDefinition
  readonly sceneStyle: PSceneStyle
  readonly time: PTime
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
  day: DAY_WEATHER_SOURCES,
  night: NIGHT_WEATHER_SOURCES,
} satisfies Readonly<Record<PTime, Readonly<Record<WeatherSceneCondition, string>>>>

const WEATHER_MASKS = {
  day: {
    reading: {precipitation: readingPrecipitationMask, window: readingWindowMask},
    typing: {
      precipitation: dayTypingPrecipitationMask,
      window: dayTypingWindowMask,
    },
    writing: {
      precipitation: writingPrecipitationMask,
      window: writingWindowMask,
    },
  },
  night: {
    reading: {precipitation: readingPrecipitationMask, window: readingWindowMask},
    typing: {
      precipitation: nightTypingPrecipitationMask,
      window: nightTypingWindowMask,
    },
    writing: {
      precipitation: writingPrecipitationMask,
      window: writingWindowMask,
    },
  },
} satisfies Readonly<Record<PTime, Readonly<Record<PActivity, WeatherMasks>>>>

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
  time: PTime,
  condition: WeatherSceneCondition,
  beforeLayerId: string | undefined,
  maskSource: string,
) => {
  const opacity = time === 'night' ? NIGHT_PRECIPITATION_OPACITY : 1

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
  options: ApplyWeatherSceneLayerOptions,
): PixiLayerSceneDefinition => {
  if (options.sceneStyle !== 'original') {
    return options.scene
  }

  const headIndex = options.scene.layers.findIndex((layer) => layer.id === 'head')
  const insertionIndex = getWeatherInsertionIndex(options.scene, options.condition)
  const masks = WEATHER_MASKS[options.time][options.activity]
  const weatherLayer = {
    id: `weather-${options.condition}`,
    maskSource: masks.window,
    source: WEATHER_SOURCES[options.time][options.condition],
  }

  return {
    ...options.scene,
    effects: [
      ...(options.scene.effects ?? []),
      ...getWeatherEffect(
        options.time,
        options.condition,
        headIndex === -1 ? undefined : 'head',
        masks.precipitation,
      ),
    ],
    id: `${options.scene.id}-weather-${options.condition}`,
    layers: [
      ...options.scene.layers.slice(0, insertionIndex),
      weatherLayer,
      ...options.scene.layers.slice(insertionIndex),
    ],
  }
}
