import type {PixiLayerSceneDefinition, PSceneId, PSceneStyle} from '../focus-room-animation'
import clearImage from './assets/scene/day-clear.jpg'
import cloudyImage from './assets/scene/day-cloudy.jpg'
import rainImage from './assets/scene/day-rain.jpg'
import snowImage from './assets/scene/day-snow.jpg'
import nightClearImage from './assets/scene/night-clear.jpg'
import nightCloudyImage from './assets/scene/night-cloudy.jpg'
import nightOvercastImage from './assets/scene/night-overcast.jpg'
import nightRainImage from './assets/scene/night-rain.jpg'
import nightSnowImage from './assets/scene/night-snow.jpg'
import overcastImage from './assets/scene/day-overcast.jpg'
import precipitationEffectMask from './assets/scene/precipitation-effect-mask.png'
import windowMask from './assets/scene/day-reading-focused-mask.png'
import type {WeatherSceneCondition} from './scene-mode'

type WeatherSceneId = 'day-reading-focused' | 'night-reading-focused'

const NIGHT_PRECIPITATION_OPACITY = 0.4

const WEATHER_SOURCES = {
  'day-reading-focused': {
    clear: clearImage,
    cloudy: cloudyImage,
    overcast: overcastImage,
    rain: rainImage,
    snow: snowImage,
  },
  'night-reading-focused': {
    clear: nightClearImage,
    cloudy: nightCloudyImage,
    overcast: nightOvercastImage,
    rain: nightRainImage,
    snow: nightSnowImage,
  },
} satisfies Readonly<Record<WeatherSceneId, Readonly<Record<WeatherSceneCondition, string>>>>

const isWeatherScene = (sceneId: PSceneId): sceneId is WeatherSceneId =>
  sceneId === 'day-reading-focused' || sceneId === 'night-reading-focused'

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
) => {
  const opacity = sceneId === 'night-reading-focused' ? NIGHT_PRECIPITATION_OPACITY : 1

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
          maskSource: precipitationEffectMask,
          opacity,
        },
      ]
    case 'snow':
      return [
        {
          beforeLayerId,
          id: 'weather-snow',
          kind: 'falling-flakes' as const,
          maskSource: precipitationEffectMask,
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
  const weatherLayer = {
    id: `weather-${condition}`,
    maskSource: windowMask,
    source: WEATHER_SOURCES[sceneId][condition],
  }

  return {
    ...scene,
    effects: [
      ...(scene.effects ?? []),
      ...getWeatherEffect(sceneId, condition, headIndex === -1 ? undefined : 'head'),
    ],
    id: `${scene.id}-weather-${condition}`,
    layers: [
      ...scene.layers.slice(0, insertionIndex),
      weatherLayer,
      ...scene.layers.slice(insertionIndex),
    ],
  }
}
