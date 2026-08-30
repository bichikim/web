import {describe, expect, it} from 'vitest'

import type {PixiLayerSceneDefinition, PSceneId} from '../../focus-room-animation'
import {applyWeatherSceneLayer, type WeatherSceneCondition} from '..'

const createScene = (
  includeHead = true,
  id = 'day-reading-focused-layers',
): PixiLayerSceneDefinition => ({
  background: '#000000',
  height: 941,
  id,
  layers: [
    {id: 'background', source: '/background.webp'},
    ...(includeHead ? [{id: 'head', source: '/head.webp'}] : []),
    {id: 'left-hand', source: '/left-hand.webp'},
  ],
  width: 1672,
})

const getMaskPrefix = (sceneId: PSceneId): string | null => {
  switch (sceneId) {
    case 'day-reading-focused':
    case 'night-reading-focused':
      return null
    case 'day-reading-user':
    case 'day-typing-focused':
    case 'day-typing-user':
    case 'day-writing-focused':
    case 'day-writing-user':
    case 'night-reading-user':
    case 'night-typing-focused':
    case 'night-typing-user':
    case 'night-writing-focused':
    case 'night-writing-user':
      return sceneId
    default:
      throw new Error(`Unsupported weather scene in test: ${sceneId}`)
  }
}

describe('applyWeatherSceneLayer', () => {
  it.each([
    ['day-reading-focused', 'clear', 'day-clear.jpg'],
    ['day-reading-focused', 'cloudy', 'day-cloudy.jpg'],
    ['day-reading-focused', 'overcast', 'day-overcast.jpg'],
    ['day-reading-focused', 'rain', 'day-rain.jpg'],
    ['day-reading-focused', 'snow', 'day-snow.jpg'],
    ['day-reading-user', 'clear', 'day-clear.jpg'],
    ['day-reading-user', 'cloudy', 'day-cloudy.jpg'],
    ['day-reading-user', 'overcast', 'day-overcast.jpg'],
    ['day-reading-user', 'rain', 'day-rain.jpg'],
    ['day-reading-user', 'snow', 'day-snow.jpg'],
    ['day-typing-focused', 'clear', 'day-clear.jpg'],
    ['day-typing-focused', 'cloudy', 'day-cloudy.jpg'],
    ['day-typing-focused', 'overcast', 'day-overcast.jpg'],
    ['day-typing-focused', 'rain', 'day-rain.jpg'],
    ['day-typing-focused', 'snow', 'day-snow.jpg'],
    ['day-typing-user', 'clear', 'day-clear.jpg'],
    ['day-typing-user', 'cloudy', 'day-cloudy.jpg'],
    ['day-typing-user', 'overcast', 'day-overcast.jpg'],
    ['day-typing-user', 'rain', 'day-rain.jpg'],
    ['day-typing-user', 'snow', 'day-snow.jpg'],
    ['day-writing-focused', 'clear', 'day-clear.jpg'],
    ['day-writing-focused', 'cloudy', 'day-cloudy.jpg'],
    ['day-writing-focused', 'overcast', 'day-overcast.jpg'],
    ['day-writing-focused', 'rain', 'day-rain.jpg'],
    ['day-writing-focused', 'snow', 'day-snow.jpg'],
    ['day-writing-user', 'clear', 'day-clear.jpg'],
    ['day-writing-user', 'cloudy', 'day-cloudy.jpg'],
    ['day-writing-user', 'overcast', 'day-overcast.jpg'],
    ['day-writing-user', 'rain', 'day-rain.jpg'],
    ['day-writing-user', 'snow', 'day-snow.jpg'],
    ['night-reading-focused', 'clear', 'night-clear.jpg'],
    ['night-reading-focused', 'cloudy', 'night-cloudy.jpg'],
    ['night-reading-focused', 'overcast', 'night-overcast.jpg'],
    ['night-reading-focused', 'rain', 'night-rain.jpg'],
    ['night-reading-focused', 'snow', 'night-snow.jpg'],
    ['night-reading-user', 'clear', 'night-clear.jpg'],
    ['night-reading-user', 'cloudy', 'night-cloudy.jpg'],
    ['night-reading-user', 'overcast', 'night-overcast.jpg'],
    ['night-reading-user', 'rain', 'night-rain.jpg'],
    ['night-reading-user', 'snow', 'night-snow.jpg'],
    ['night-typing-focused', 'clear', 'night-clear.jpg'],
    ['night-typing-focused', 'cloudy', 'night-cloudy.jpg'],
    ['night-typing-focused', 'overcast', 'night-overcast.jpg'],
    ['night-typing-focused', 'rain', 'night-rain.jpg'],
    ['night-typing-focused', 'snow', 'night-snow.jpg'],
    ['night-typing-user', 'clear', 'night-clear.jpg'],
    ['night-typing-user', 'cloudy', 'night-cloudy.jpg'],
    ['night-typing-user', 'overcast', 'night-overcast.jpg'],
    ['night-typing-user', 'rain', 'night-rain.jpg'],
    ['night-typing-user', 'snow', 'night-snow.jpg'],
    ['night-writing-focused', 'clear', 'night-clear.jpg'],
    ['night-writing-focused', 'cloudy', 'night-cloudy.jpg'],
    ['night-writing-focused', 'overcast', 'night-overcast.jpg'],
    ['night-writing-focused', 'rain', 'night-rain.jpg'],
    ['night-writing-focused', 'snow', 'night-snow.jpg'],
    ['night-writing-user', 'clear', 'night-clear.jpg'],
    ['night-writing-user', 'cloudy', 'night-cloudy.jpg'],
    ['night-writing-user', 'overcast', 'night-overcast.jpg'],
    ['night-writing-user', 'rain', 'night-rain.jpg'],
    ['night-writing-user', 'snow', 'night-snow.jpg'],
  ] satisfies ReadonlyArray<[PSceneId, WeatherSceneCondition, string]>)(
    'should insert the %s %s view before character layers',
    (sceneId, condition, sourceName) => {
      const scene = createScene(true, `${sceneId}-layers`)
      const result = applyWeatherSceneLayer(scene, sceneId, 'original', condition)
      const sceneMaskPrefix = getMaskPrefix(sceneId)
      const windowMaskName =
        sceneMaskPrefix === null ? 'day-reading-focused-mask.png' : `${sceneMaskPrefix}-mask.png`
      const precipitationMaskName =
        sceneMaskPrefix === null
          ? 'precipitation-effect-mask.png'
          : `${sceneMaskPrefix}-precipitation-effect-mask.png`

      expect(result).not.toBe(scene)
      expect(result.id).toBe(`${sceneId}-layers-weather-${condition}`)
      expect(result.layers.map((layer) => layer.id)).toEqual([
        'background',
        `weather-${condition}`,
        'head',
        'left-hand',
      ])
      expect(result.layers[1]).toMatchObject({
        maskSource: expect.stringContaining(windowMaskName),
        source: expect.stringContaining(sourceName),
      })
      expect(result.effects).toEqual(
        condition === 'rain'
          ? [
              {
                beforeLayerId: 'head',
                id: 'weather-rain',
                kind: 'falling-streaks',
                maskSource: expect.stringContaining(precipitationMaskName),
                opacity: sceneId.startsWith('night-') ? 0.4 : 1,
              },
            ]
          : condition === 'snow'
            ? [
                {
                  beforeLayerId: 'head',
                  id: 'weather-snow',
                  kind: 'falling-flakes',
                  maskSource: expect.stringContaining(precipitationMaskName),
                  opacity: sceneId.startsWith('night-') ? 0.4 : 1,
                },
              ]
            : [],
      )
    },
  )

  it.each([
    ['day-reading-focused', 'scribble', 'rain'],
    ['night-writing-user', 'scribble', 'rain'],
  ] satisfies ReadonlyArray<[PSceneId, 'original' | 'scribble', WeatherSceneCondition]>)(
    'should preserve an unsupported style for %s %s %s',
    (sceneId, sceneStyle, condition) => {
      const scene = createScene()

      expect(applyWeatherSceneLayer(scene, sceneId, sceneStyle, condition)).toBe(scene)
    },
  )

  it('should append the weather view when a scene has no character layer', () => {
    const result = applyWeatherSceneLayer(
      createScene(false),
      'day-reading-focused',
      'original',
      'rain',
    )

    expect(result.layers.map((layer) => layer.id)).toEqual([
      'background',
      'left-hand',
      'weather-rain',
    ])
    expect(result.effects).toMatchObject([{beforeLayerId: undefined}])
  })

  it('should keep the clear view behind ambient scene layers', () => {
    const scene: PixiLayerSceneDefinition = {
      ...createScene(),
      layers: [
        {id: 'background', source: '/background.webp'},
        {id: 'sky-star-1', source: '/star.webp'},
        {id: 'head', source: '/head.webp'},
        {id: 'left-hand', source: '/left-hand.webp'},
      ],
    }

    const result = applyWeatherSceneLayer(scene, 'night-reading-focused', 'original', 'clear')

    expect(result.layers.map((layer) => layer.id)).toEqual([
      'background',
      'weather-clear',
      'sky-star-1',
      'head',
      'left-hand',
    ])
  })

  it('should prepend a clear view when the scene has no background layer', () => {
    const scene: PixiLayerSceneDefinition = {
      ...createScene(),
      layers: [
        {id: 'head', source: '/head.webp'},
        {id: 'left-hand', source: '/left-hand.webp'},
      ],
    }

    const result = applyWeatherSceneLayer(scene, 'day-reading-focused', 'original', 'clear')

    expect(result.layers.map((layer) => layer.id)).toEqual(['weather-clear', 'head', 'left-hand'])
  })
})
